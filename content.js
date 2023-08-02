const API_BASE_URL =
  "https://rls7a91cpd.execute-api.eu-central-1.amazonaws.com/dev/";
let products;

function createPopup(product) {
  // Create a new div for the Popup
  const popup = document.createElement("div");
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.backgroundColor = "#FFF";
  popup.style.padding = "20px";
  popup.style.zIndex = "1000";
  popup.style.display = "flex";
  popup.style.flexDirection = "column";
  popup.style.gap = "10px";
  popup.style.width = "300px"; // Or whatever width you desire

  // Create labels and text fields
  const asinLabel = document.createElement("label");
  asinLabel.textContent = "Amazon ASIN";
  const asin = document.createElement("input");
  asin.type = "text";
  asin.placeholder = "Amazon ASIN";
  asin.value = product["asin"];

  const priceLabel = document.createElement("label");
  priceLabel.textContent = "Aktueller Preis auf Amazon";
  const currentAmazonPrice = document.createElement("input");
  currentAmazonPrice.type = "text";
  currentAmazonPrice.placeholder = "Aktueller Preis auf Amazon";
  currentAmazonPrice.value = product["current_amazon_price"] || 0;

  const maxPriceLabel = document.createElement("label");
  maxPriceLabel.textContent = "Kauf lohnt ab €";
  const maxPrice = document.createElement("input");
  maxPrice.type = "text";
  maxPrice.placeholder = "Kauf lohnt ab €";
  maxPrice.value = product["visynet_max_price"];

  // Create a button to close the Popup
  const sendButton = document.createElement("button");
  sendButton.textContent = "Speichern";
  sendButton.onclick = async function () {
    let response = await fetch(API_BASE_URL + "products/" + product["id"], {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asin: asin.value,
        current_amazon_price: currentAmazonPrice.value,
        current_amazon_price_timestamp: new Date().toISOString(),
        visynet_max_price: maxPrice.value,
      }),
    });
    let data = await response.json();
    let patchedProduct = data["product"];
    let patchedProductId = patchedProduct["id"];
    products[patchedProductId] = patchedProduct;
    setPriceColor(patchedProductId, patchedProduct["visynet_max_price"] || 0);
  };
  const closeButton = document.createElement("button");
  closeButton.textContent = "Schließen";
  closeButton.onclick = function () {
    document.body.removeChild(popup);
  };

  // Add the labels, text fields, and the close button to the Popup
  popup.appendChild(asinLabel);
  popup.appendChild(asin);
  popup.appendChild(priceLabel);
  popup.appendChild(currentAmazonPrice);
  popup.appendChild(maxPriceLabel);
  popup.appendChild(maxPrice);
  popup.appendChild(sendButton);
  popup.appendChild(closeButton);

  // Add the Popup to the body
  document.body.appendChild(popup);
}

function getButton(buttonAttributes) {
  let button = document.createElement("button");
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

function getButtonContainer(buttons) {
  let div = document.createElement("div");
  div.className = "buttons-container";

  for (const element of buttons) {
    let button = getButton(element);
    div.appendChild(button);
  }
  return div;
}

function extractOriginalNumber(element) {
  let listItems = element.querySelectorAll("ul li");
  for (const element of listItems) {
    if (
      element.textContent.includes("ORIG.") ||
      element.textContent.includes("Origiinal") ||
      element.textContent.includes("ORIGINALE") ||
      element.textContent.includes("ORIGINAL")
    ) {
      return element.textContent.split(" ")[1];
    }
  }
  return null;
}

function extractProductId(element) {
  return element.querySelector("a[id]").id;
}

function extractProductTitle(element) {
  return element.querySelector("a[title]").title;
}

async function writeProductToDB(id, title) {
  try {
    const response = await fetch(API_BASE_URL + "products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product: { id: id, title: title } }),
    });
    const data = await response.json();
    return data["product"];
  } catch (error) {
    console.error("Error while creating product:", error);
  }
}

async function getProduct(id) {
  try {
    const response = await fetch(API_BASE_URL + "products/" + id);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
  }
}

function getLiItemById(id) {
  let aTag = document.getElementById(id);
  return aTag.parentNode;
}

function getLatestProductElements() {
  let galleries = document.querySelectorAll(".gallery-c");
  let lastGallery = galleries[galleries.length - 1];
  return lastGallery.querySelectorAll(".zindex.draggable");
}

function getLatestIds() {
  let latestElements = getLatestProductElements();
  let ids = [];
  for (const element of latestElements) {
    ids.push(extractProductId(element));
  }
  return ids;
}

function setPriceColor(productId, comparePrice) {
  try {
    let li = getLiItemById(productId);
    let priceElement = li.querySelector(".price");
    let price = parseFloat(priceElement.innerText.replace(/[^0-9.]/g, ""));
    let color = "";
    if (price / 100 < comparePrice) {
      color = "green";
    } else {
      color = "red";
    }
    if (comparePrice == 0) color = "black";
    priceElement.style.color = color;
  } catch (error) {
    console.error("Error while setting price color: " + productId, error);
  }
}

/**
 * This function calculates a hash code for a given input string. It uses a
 * hashing known as djb2."
 *
 * @param {String} string The input string to be hashed.
 *
 * @returns {Number} The computed hash code of the input string as a 32-bit integer.
 */
function hashCode(string) {
  let hash = 0,
    i,
    chr;
  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function generateIdentifierForButtons(buttons) {
  let identifier = "";
  for (const element of buttons) {
    identifier += element.backgroundColor + element.link;
  }
  // Create a hash of the identifier string to use as an id
  return "bc_" + hashCode(identifier);
}

function setButtonsForProduct(id, buttons) {
  let li = getLiItemById(id);
  let buttonsContainer = getButtonContainer(buttons);
  let uniqueId = generateIdentifierForButtons(buttons);
  buttonsContainer.id = uniqueId;
  let exisingButtonsContainer = li.querySelector("#" + uniqueId);
  if (!exisingButtonsContainer) {
    li.appendChild(buttonsContainer);
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
function getAmazonLink(asin, originalNumber) {
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
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await reponse.json();
    return data.products;
  } catch (error) {
    console.error("Error while fetching all products:", error);
  }
}

async function main() {
  products = await getAllProducts();
  console.log(products);

  let debounceTimeout;
  const debouncedObserverCallback = async function () {
    clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(async function () {
      products = await getAllProducts();
      let latestIds = getLatestIds();
      for (const productId of latestIds) {
        let currentLiItem = getLiItemById(productId);
        let currentProduct = products[productId] || {};
        let productTitle = extractProductTitle(currentLiItem);
        let originalNumber = extractOriginalNumber(currentLiItem);
        setPriceColor(productId, currentProduct.visynet_max_price || 0);

        if (!products.hasOwnProperty(productId)) {
          let product = await writeProductToDB(productId, productTitle);
          products[productId] = product;
        }
        setButtonsForProduct(productId, [
          {
            backgroundColor: "grey",
            link: getAmazonLink(currentProduct.asin || "", originalNumber),
          },
          {
            backgroundColor: "grey",
            functionToExecute: () => createPopup(currentProduct),
          },
        ]);
      }
    }, 1000); // 1-second delay
  };

  const resizeObserver = new ResizeObserver(debouncedObserverCallback);
  resizeObserver.observe(document.body);
}

function insertStyleElement() {
  // Create a new style element
  let style = document.createElement("style");

  // Define your CSS inside the style element
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

  // Append the style element to the head of the document
  document.head.appendChild(style);
}
window.onload = () => {
  insertStyleElement();
  main(); // Invoke haupt function here
};
