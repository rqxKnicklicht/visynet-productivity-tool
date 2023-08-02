import psycopg2
import json
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def build_response(status_code, content):
    return {
        "statusCode": status_code,
        "body": json.dumps(content),
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": True,
        },
    }


def row_to_product(row: tuple):
    return {
        "id": row[0],
        "title": row[1],
        "asin": row[2],
        "current_amazon_price": float(row[3]) if row[3] else None,
        "current_amazon_timestamp": row[4].strftime("%Y-%m-%d %H:%M:%S")
        if row[4]
        else None,
        "brand_id": row[5],
        "visynet_max_price": float(row[6]) if row[6] else None,
    }


def lambda_handler(event, _context):
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            host=os.getenv("DB_HOST"),
            password=os.getenv("DB_PASSWORD"),
            port=os.getenv("DB_PORT"),
            options=os.getenv("DB_OPTIONS"),
        )
        logger.info("Successfully connected to database.")

        product_id = event["pathParameters"]["product-id"]

        if event["httpMethod"] == "GET":
            logger.info(f"GET request received for product with id: '{product_id}'.")
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, title, asin, current_amazon_price, current_amazon_price_timestamp, brand_id, visynet_max_price
                        FROM product
                        WHERE id = %s;
                        """,
                        (product_id,),
                    )
                    return build_response(
                        200, {"product": row_to_product(cursor.fetchone())}
                    )
        elif event["httpMethod"] == "PATCH":
            logger.info(f"PATCH request received for product with id: '{product_id}'.")
            body: dict = json.loads(event["body"])
            allowed_columns = [
                "title",
                "asin",
                "brand_id",
                "visynet_max_price",
                "current_amazon_price",
                "current_amazon_timestamp",
            ]
            body = {key: value for key, value in body.items() if key in allowed_columns}

            set_clause = ", ".join([f"{key} = %s" for key in body.keys()])
            parameters = tuple(body.values())
            product_id_parameter = (product_id,)
            parameters += product_id_parameter

            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        f"""
                        UPDATE product
                        SET {set_clause}
                        WHERE id = %s;
                        """,
                        parameters,
                    )
                    cursor.execute(
                        """
                        SELECT *
                        FROM product
                        WHERE id = %s;
                        """,
                        product_id_parameter,
                    )
                    updated_product = row_to_product(cursor.fetchone())

                    return build_response(
                        200,
                        {
                            "message": "Product updated successfully.",
                            "product": updated_product,
                        },
                    )

        elif event["httpMethod"] == "DELETE":
            logger.info(f"DELETE request received for product with id: '{product_id}'.")
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        DELETE FROM product
                        WHERE id = %s;
                        """,
                        (product_id,),
                    )
                    return build_response(
                        200, {"message": "Product deleted successfully, if it existed."}
                    )
    except Exception:
        logger.exception("An error occurred while executing the lambda function: ")
        return build_response(500, {"message": "Internal server error."})
    finally:
        conn.close()
        logger.info("Successfully closed database connection.")
