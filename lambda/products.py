import psycopg2
from psycopg2.errors import UniqueViolation
import json
import logging

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
    }


def lambda_handler(event, _context):
    try:
        conn = psycopg2.connect(
            dbname="bazzingo",
            user="postgres",
            host="database-1.caesvsq2u1qo.eu-central-1.rds.amazonaws.com",
            password="jcc3udm6Q]ujt^NQKpwG",
            port="5432",
            options="-c search_path=product-extension",
        )

        if event["httpMethod"] == "POST":
            with conn:
                with conn.cursor() as cursor:
                    body = json.loads(event["body"])
                    product = body.get("product")
                    product_title, product_id = product.get("title"), product.get("id")
                    logger.info(
                        f"POST request received for product with id '{product_id}'."
                    )
                    cursor.execute(
                        """
                        INSERT INTO product (id, title)
                        VALUES (%s, %s)
                        RETURNING *;
                        """,
                        (product_id, product_title),
                    )
                    inserted_product = row_to_product(cursor.fetchone())
                    return build_response(
                        200,
                        {
                            "message": "Successfully inserted product.",
                            "product": inserted_product,
                        },
                    )
        elif event["httpMethod"] == "GET":
            logger.info("GET request received.")
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT id, title, asin, current_amazon_price, current_amazon_price_timestamp, brand_id FROM product"
                    )
                    products = {}
                    for row in cursor.fetchall():
                        product = row_to_product(row)
                        products[product.get("id")] = product
                    logger.info(f"Found {len(products)} products.")
                    return build_response(200, {"products": products})
    except UniqueViolation:
        return build_response(409, {"message": "Product already exists."})
    except Exception:
        logger.exception("An error occured while executing the lambda function: ")
        return build_response(500, {"message": "Internal server error."})
    finally:
        conn.close()