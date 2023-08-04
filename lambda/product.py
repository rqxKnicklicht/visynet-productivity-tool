import json
import logging
import os

import psycopg2

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def build_response(status_code, content={}):
    return {
        "statusCode": status_code,
        "body": json.dumps(content),
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Credentials": "true",
            # "Access-Control-Expose-Headers": "Authorization",  # Optional
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
        "original_number": row[7],
    }


def lambda_handler(event, _context):
    try:
        http_method = event["httpMethod"]
        logger.info("Received {} request.".format(http_method))
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

        if http_method == "GET":
            logger.info("GET request received for product with ID: '%s'.", product_id)
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, title, asin, current_amazon_price, current_amazon_price_timestamp, brand_id, visynet_max_price, original_number
                        FROM product
                        WHERE id = %s;
                        """,
                        (product_id,),
                    )
                    return build_response(
                        200, {"product": row_to_product(cursor.fetchone())}
                    )
        elif http_method == "PATCH":
            body: dict = json.loads(event["body"])
            logger.info("PATCH request received for product with ID: '%s'.", product_id)
            logger.debug("Request body: %s", body)
            allowed_columns = [
                "title",
                "asin",
                "brand_id",
                "visynet_max_price",
                "current_amazon_price",
                "current_amazon_timestamp",
                "original_number",
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

        elif http_method == "DELETE":
            logger.info(
                "DELETE request received for product with ID: '%s'.", product_id
            )
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
        elif http_method == "PUT":
            body: dict = json.loads(event["body"])
            product = body["product"]
            product_tuple = (
                product["id"],
                product["title"],
                product["asin"],
                product["current_amazon_price"],
                product["current_amazon_timestamp"],
                product["brand_id"],
                product["visynet_max_price"],
                product["original_number"],
            )
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO product
                        (id, title, asin, current_amazon_price, current_amazon_price_timestamp, brand_id, visynet_max_price, original_number)
                        VALUES
                        (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        asin = EXCLUDED.asin,
                        current_amazon_price = EXCLUDED.current_amazon_price,
                        current_amazon_price_timestamp = EXCLUDED.current_amazon_price_timestamp,
                        brand_id = EXCLUDED.brand_id,
                        visynet_max_price = EXCLUDED.visynet_max_price,
                        original_number = EXCLUDED.original_number;
                        """,
                        product_tuple,
                    )
                    return build_response(204)

        else:
            return build_response(405, {"message": "Method not allowed."})
    except Exception:
        logger.exception(
            "An unexpected error occured while executing the lambda function: "
        )
        return build_response(500, {"message": "Internal server error."})
    finally:
        conn.close()
        logger.info("Successfully closed database connection.")
