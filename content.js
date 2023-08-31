// Base URL for the API to interact with
const API_BASE_URL =
  "https://rls7a91cpd.execute-api.eu-central-1.amazonaws.com/dev/";

// Variable to hold the products, yet to be populated
let products;

// API key for authentication. Replace empty string with your API key.
const API_KEY = "";

// Headers object to be used with API requests
const HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

/**
 * Creates a div element with given styles.
 *
 * @param {Object} styles - An object containing the CSS styles to be applied.
 * @returns {HTMLElement} - The created div element.
 */
function createDiv(styles) {
  const div = document.createElement("div");
  Object.assign(div.style, styles);
  return div;
}

/**
 * Creates an HTML element with given tag name, text content, and styles.
 *
 * @param {string} tag - The HTML tag name for the element.
 * @param {string} textContent - The text to be contained in the element.
 * @param {Object} styles - An object containing the CSS styles to be applied.
 * @returns {HTMLElement} - The created HTML element.
 */
function createElement(tag, textContent, styles) {
  const element = document.createElement(tag);
  element.textContent = textContent;
  Object.assign(element.style, styles);
  return element;
}

/**
 * Creates a label and input element pair.
 *
 * @param {string} type - The type of the input element (e.g., 'text', 'password').
 * @param {string} placeholder - The placeholder text for the input element.
 * @param {string} value - The initial value of the input element.
 * @returns {Object} - An object containing the created label and input elements.
 */
function createInput(type, placeholder, value) {
  const label = createElement("label", placeholder);
  const input = document.createElement("input");
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;
  return { label, input };
}

/**
 * Creates a button element with a text and click handler function.
 *
 * @param {string} textContent - The text to be displayed on the button.
 * @param {Function} onClickFunction - The function to execute when the button is clicked.
 * @returns {HTMLElement} - The created button element.
 */
function createPopupButton(textContent, onClickFunction) {
  const button = document.createElement("button");
  button.textContent = textContent;
  button.onclick = onClickFunction;
  return button;
}

/**
 * Asynchronously saves changes to a product by making a PATCH request to the API.
 *
 * @param {Object} product - The product object to update.
 * @param {Object} inputs - An object containing the new values for the product fields.
 */
async function saveChanges(product, inputs) {
  try {
    // Make a PATCH request to update the product with new values
    const response = await fetch(API_BASE_URL + "products/" + product["id"], {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asin: inputs.asin.value,
        current_amazon_price: inputs.currentAmazonPrice.value,
        current_amazon_price_timestamp: new Date().toISOString(),
        visynet_max_price: inputs.maxPrice.value,
      }),
    });

    // Check for successful response
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the response JSON
    let data = await response.json();
    let patchedProduct = data["product"];
    let patchedProductId = patchedProduct["id"];

    // Update the local 'products' object with the new product data
    products[patchedProductId] = patchedProduct;

    // Update the color based on the new 'visynet_max_price'
    setPriceColor(patchedProductId, patchedProduct["visynet_max_price"] || 0);

    // Update the UI buttons related to the product
    setButtonsForProduct(patchedProductId, [
      {
        backgroundColor: "orange",
        link: getAmazonLink(patchedProduct["asin"]),
      },
      {
        backgroundColor: "grey",
        functionToExecute: () => createPopup(patchedProduct),
      },
    ]);
  } catch (error) {
    // Show an error alert and log the error to the console
    alert(
      "Error while saving the product. Check browser console or CloudWatch logs for further information."
    );
    console.error("An error occurred:", error);
  }
}

/**
 * Creates and displays a popup with product details.
 *
 * @param {Object} product - The product object containing details to be displayed.
 */
function createPopup(product) {
  // Create an overlay behind the popup
  const overlay = createDiv({
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: "999",
  });
  document.body.appendChild(overlay);

  // Create the main div for the popup
  const popup = createDiv({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "#FFF",
    padding: "20px",
    zIndex: "1000",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "400px",
  });

  // Create the title, labels, text fields and buttons for the popup
  const title = createElement("h2", product["title"], { textAlign: "center" });
  const id = createElement("p", `Product ID: ${product["id"]}`, {
    textAlign: "center",
  });
  const originalNumber = createElement(
    "p",
    `Originalnummer: ${product["original_number"]}`,
    { textAlign: "center" }
  );
  const asin = createInput("text", "Amazon ASIN", product["asin"]);
  const currentAmazonPrice = createInput(
    "text",
    "Aktueller Preis auf Amazon (Format: 00.00€)",
    product["current_amazon_price"] || 0
  );
  const maxPrice = createInput(
    "text",
    "Kauf lohnt ab (Format 00.00€)",
    product["visynet_max_price"]
  );

  // Group all necessary input fields for easier access later
  const inputs = {
    asin: asin.input,
    currentAmazonPrice: currentAmazonPrice.input,
    maxPrice: maxPrice.input,
  };

  // Create close and save buttons for the popup
  const closeButton = createPopupButton("Schließen", () => {
    document.body.removeChild(popup);
    document.body.removeChild(overlay);
  });
  const sendButton = createPopupButton("Speichern", () => {
    saveChanges(product, inputs);
    document.body.removeChild(popup);
    document.body.removeChild(overlay);
  });

  // Append all created elements to the popup
  popup.append(
    title,
    id,
    originalNumber,
    asin.label,
    asin.input,
    currentAmazonPrice.label,
    currentAmazonPrice.input,
    maxPrice.label,
    maxPrice.input,
    sendButton,
    closeButton
  );

  // Add the popup to the body of the document
  document.body.appendChild(popup);
}
/**
 * Creates an interface button based on the provided attributes.
 * @param {Object} buttonAttributes - Object containing button properties like backgroundColor, functionToExecute, and link.
 * @returns {HTMLElement} - A button element.
 */
function createInterfaceButton(buttonAttributes) {
  const button = document.createElement("button");
  button.style.backgroundColor = buttonAttributes.backgroundColor;

  if ("functionToExecute" in buttonAttributes) {
    button.addEventListener("click", buttonAttributes.functionToExecute);
  }
  if ("link" in buttonAttributes) {
    button.addEventListener("click", function () {
      window.open(buttonAttributes.link, "_blank");
    });
  }
  return button;
}

/**
 * Creates a container div and populates it with buttons.
 * @param {Array} buttons - Array of objects describing each button to be created.
 * @returns {HTMLElement} - A div containing the buttons.
 */
function getButtonContainer(buttons) {
  const div = document.createElement("div");
  div.className = "buttons-container";

  for (const element of buttons) {
    const button = createInterfaceButton(element);
    div.appendChild(button);
  }
  return div;
}

/**
 * Extracts the original number from a given element based on specific keywords.
 * @param {HTMLElement} element - The element containing the original number text.
 * @returns {string|null} - The extracted original number or null if not found.
 */
function extractOriginalNumber(element) {
  const listItems = element.querySelectorAll("ul li");
  for (const item of listItems) {
    if (
      item.textContent.includes("ORIG.") ||
      item.textContent.includes("Origiinal") ||
      item.textContent.includes("ORIGINALE") ||
      item.textContent.includes("ORIGINAL")
    ) {
      return item.textContent.split(" ")[1];
    }
  }
  return null;
}

/**
 * Extracts the product ID from a given element.
 * @param {HTMLElement} element - The element containing the product ID.
 * @returns {string} - The extracted product ID.
 */
function extractProductId(element) {
  return element.querySelector("a[id]").id;
}

/**
 * Extracts the product title from a given element.
 * @param {HTMLElement} element - The element containing the product title.
 * @returns {string} - The extracted product title.
 */
function extractProductTitle(element) {
  return element.querySelector("a[title]").title;
}

/**
 * Creates a new product in the database.
 * @param {string} id - The product ID.
 * @param {string} title - The product title.
 * @param {string} originalNumber - The original number of the product.
 * @returns {Object} - The created product object.
 */
async function writeProductToDB(id, title, originalNumber) {
  try {
    const response = await fetch(API_BASE_URL + "products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: { id: id, title: title, original_number: originalNumber },
      }),
    });
    const data = await response.json();
    return data["product"];
  } catch (error) {
    console.error("Error while creating product:", error);
  }
}

/**
 * Fetches a product by ID from the database.
 * @param {string} id - The product ID.
 * @returns {Object} - The fetched product object.
 */
async function getProduct(id) {
  try {
    const response = await fetch(API_BASE_URL + "products/" + id);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Retrieves the parent list item of an element by its ID.
 * @param {string} id - The ID of the child element.
 * @returns {HTMLElement} - The parent list item.
 */
function getLiItemById(id) {
  const aTag = document.getElementById(id);
  return aTag.parentNode;
}

/**
 * Retrieves the latest product elements within a page's gallery.
 * @returns {NodeList} - NodeList of the latest draggable product elements.
 */
function getLatestProductElements() {
  const galleries = document.querySelectorAll(".gallery-c");
  const lastGallery = galleries[galleries.length - 1];
  return lastGallery.querySelectorAll(".zindex.draggable");
}

/**
 * Extracts the IDs of the latest product elements on the page.
 * @returns {Array} - Array containing the IDs of the latest products.
 */
function getLatestIds() {
  const latestElements = getLatestProductElements();
  const ids = [];

  for (const element of latestElements) {
    ids.push(extractProductId(element));
  }
  return ids;
}

/**
 * Changes the color of the product price based on a comparison value.
 * @param {string} productId - The ID of the product.
 * @param {number} comparePrice - The price to compare against.
 */
function setPriceColor(productId, comparePrice) {
  try {
    const li = getLiItemById(productId);
    const priceElement = li.querySelector(".price");
    const priceNodes = Array.from(priceElement.childNodes);

    // Extract and clean the price(s)
    const prices = priceNodes
      .filter(
        (node) =>
          node.nodeType === Node.TEXT_NODE ||
          node.nodeType === Node.ELEMENT_NODE
      )
      .map((node) =>
        parseFloat(node.textContent.replace(/[^0-9.,]/g, "").replace(",", "."))
      );

    // Use the last price (the second price if it exists)
    const price = prices[prices.length - 1];

    // Determine color based on comparison
    let color = "";
    if (price < comparePrice) {
      color = "green";
    } else {
      color = "red";
    }
    if (comparePrice === 0) color = "black";
    priceElement.style.color = color;
  } catch (error) {
    console.error(
      "Error while setting price color for ID: " + productId,
      error
    );
  }
}

/**
 * Inserts or updates the buttons associated with a product.
 * @param {string} id - The ID of the product.
 * @param {Array} buttons - An array of objects describing each button to be created.
 */
function setButtonsForProduct(id, buttons) {
  const li = getLiItemById(id);
  const buttonsContainer = getButtonContainer(buttons);
  buttonsContainer.id = "buttons-container";

  // Check if a buttons container already exists, replace or add accordingly
  const existingButtonsContainer = li.querySelector("#buttons-container");
  if (!existingButtonsContainer) {
    li.appendChild(buttonsContainer);
  } else {
    existingButtonsContainer.replaceWith(buttonsContainer);
  }
}

/**
 * This function generates a specific Amazon product link based on an ASIN number,
 * or a generic search link based on an original number if the ASIN is not provided.
 *
 * @param {String} asin - The Amazon Standard Identification Number (ASIN) of the product.
 * @param {String} originalNumber - A fallback number used for searching on Amazon
 *                                  when the ASIN is not provided.
 *
 * @returns {String} - A URL pointing to the specific product on Amazon.de if an ASIN
 *                      is provided. If ASIN is not provided, it returns a URL that
 *                      initiates a search on Amazon.de with the provided original number.
 */
function getAmazonLink(asin, originalNumber = undefined) {
  if (asin != "") {
    return "https://www.amazon.de/dp/" + asin;
  } else {
    return "https://www.amazon.de/s?k=" + originalNumber;
  }
}

/**
 * This asynchronous function fetches all products from a predefined API endpoint and
 * returns them after parsing the JSON response. It uses the HTTP GET method to request data
 * and outputs the resulting products to the console.
 *
 * @returns {Promise<Object>} - A promise that resolves to an array of product data retrieved
 *                             from the API. The promise will be fulfilled with the product
 *                             data after the API response has been received and parsed.
 */
async function getAllProducts() {
  try {
    const reponse = await fetch(API_BASE_URL + "products", {
      method: "GET",
      headers: HEADERS,
    });
    const data = await reponse.json();
    return data.products;
  } catch (error) {
    console.error("Error while fetching all products:", error);
  }
}

/**
 * Asynchronously fetches products based on a list of product IDs.
 *
 * @param {Array} listOfIds - An array containing the product IDs to fetch.
 * @returns {Array} - An array of product objects or undefined if an error occurs.
 */
async function getProductsById(listOfIds) {
  try {
    // Make a GET request to fetch products by IDs
    const response = await fetch(API_BASE_URL + "products", {
      method: "GET",
      headers: HEADERS,
      // Note: 'data' is not a standard fetch option. If the API expects the IDs in the request body, you may want to use 'method: "POST"' and 'body' instead.
      data: JSON.stringify({ product_ids: listOfIds }),
    });

    // Check for successful response and parse the JSON
    if (response.ok) {
      const data = await response.json();
      return data.products;
    } else {
      console.error(`Error: HTTP status ${response.status}`);
      return null;
    }
  } catch (error) {
    // Log any errors that occur
    console.error("Error while fetching all products:", error);
    return null;
  }
}

/**
 * Main function that sets up the observer and performs actions based on DOM changes.
 */
async function main() {
  let debounceTimeout; // Variable to hold the timeout for debouncing

  // Debounced callback function for the observer
  const debouncedObserverCallback = async function () {
    clearTimeout(debounceTimeout); // Clear any existing timeout

    // Create a new timeout
    debounceTimeout = setTimeout(async function () {
      const latestIds = getLatestIds(); // Get the latest product IDs
      products = await getProductsById(latestIds); // Fetch the corresponding products

      // Loop through each product ID
      for (const productId of latestIds) {
        let currentLiItem = getLiItemById(productId);
        let currentProduct = products[productId] || {};
        let productTitle = extractProductTitle(currentLiItem);
        let originalNumber = extractOriginalNumber(currentLiItem);

        setPriceColor(productId, currentProduct.visynet_max_price || 0); // Update the price color based on max price

        // If the product is not already in the local cache, add it to the database
        if (!products.hasOwnProperty(productId)) {
          let product = await writeProductToDB(
            productId,
            productTitle,
            originalNumber
          );
          products[productId] = product; // Update the local cache
        }

        // Set buttons for each product
        setButtonsForProduct(productId, [
          {
            backgroundColor: "orange",
            link: getAmazonLink(currentProduct.asin || "", originalNumber),
          },
          {
            backgroundColor: "grey",
            functionToExecute: () => createPopup(currentProduct),
          },
        ]);
      }
    }, 1000); // Debounce delay of 1 second
  };

  // Initialize and configure the ResizeObserver
  const resizeObserver = new ResizeObserver(debouncedObserverCallback);
  resizeObserver.observe(document.body); // Observe the document body
}

/**
 * Inserts CSS styles for the extension.
 */
function insertStyleElement() {
  // Create a new style element
  const style = document.createElement("style");

  // Insert the CSS styles into the style element
  style.innerHTML = `
    .draggable .buttons-container {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      padding-left: 0;
      margin-top: 10px;
    }
    .draggable .buttons-container button {
      margin-right: 5px;
    }
  `;

  // Append the style element to the document head
  document.head.appendChild(style);
}

// Entry point: Initialize styles and invoke the main function on window load
window.onload = () => {
  insertStyleElement(); // Insert CSS styles
  main(); // Invoke the main function
};
