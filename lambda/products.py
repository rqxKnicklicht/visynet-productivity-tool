import json
import logging
import os

import psycopg2
from psycopg2.errors import UniqueViolation

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


def row_to_product(row):
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


def load_body(event) -> dict | None:
    logger.info("Trying to load body from event.")
    logger.debug("Event: {}".format(event))
    try:
        return json.loads(event["body"])
    except TypeError:
        logger.warning("Event body is None.")
        return None


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
        body = load_body(event)
        if http_method == "POST":
            with conn:
                with conn.cursor() as cursor:
                    if not body:
                        return build_response(
                            400, {"message": "Request body is required."}
                        )
                    product = body.get("product")
                    product_title, product_id, original_number = (
                        product.get("title"),
                        product.get("id"),
                        product.get("original_number"),
                    )
                    logger.info("Found product id '{}'.".format(product_id))
                    cursor.execute(
                        """
                        INSERT INTO product (id, title, original_number)
                        VALUES (%s, %s, %s)
                        RETURNING id, title, asin, current_amazon_price, current_amazon_price_timestamp, brand_id, visynet_max_price, original_number;
                        """,
                        (product_id, product_title, original_number),
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
            query = """
                    SELECT id, title, asin, current_amazon_price, current_amazon_price_timestamp, brand_id, visynet_max_price, original_number
                    FROM product
                    """

            if body:
                product_ids = body.get("product_ids")
                if product_ids:
                    products_ids_string = "'" + "', '".join(product_ids) + "'"
                    query += f" WHERE id IN ({products_ids_string})"

            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(query)
                    products = {}
                    for row in cursor.fetchall():
                        product = row_to_product(row)
                        products[product.get("id")] = product
                    product_count = len(products)
                    logger.info(
                        "Found {} {} to return.".format(
                            product_count,
                            "product" if product_count == 1 else "products",
                        )
                    )
                    return build_response(200, {"products": products})
        else:
            return build_response(405, {"message": "Method not allowed."})
    except UniqueViolation:
        logger.info(
            "Product with id '{}' already exists in the database.".format(product_id)
        )
        return build_response(409, {"message": "Product already exists."})
    except Exception:
        logger.exception("An error occured while executing the lambda function: ")
        return build_response(500, {"message": "Internal server error."})
    finally:
        conn.close()
        logger.info("Successfully closed database connection.")
