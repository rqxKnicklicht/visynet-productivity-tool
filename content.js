const API_BASE_URL =
  "https://rls7a91cpd.execute-api.eu-central-1.amazonaws.com/dev/";
let products;
const API_KEY = "";
const HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

function createPopup(product) {
  // Create an overlay
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.zIndex = "999";
  document.body.appendChild(overlay);
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
  // Create title and id
  const title = document.createElement("h2");
  title.textContent = product["title"];
  title.style.textAlign = "center";

  const id = document.createElement("p");
  id.textContent = `Product ID: ${product["id"]}`;
  id.style.textAlign = "center";

  const originalNumber = document.createElement("p");
  originalNumber.textContent = `Originalnummer: ${product["original_number"]}`;
  originalNumber.style.textAlign = "center";

  // Add the Originalnummer and copy button to the Popup

  // ...rest of the element creations...

  // Add the title, id, labels, text fields, and the close button to the Popup
  popup.appendChild(title);
  popup.appendChild(id);
  popup.appendChild(originalNumber);
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
    try {
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data = await response.json();
      let patchedProduct = data["product"];
      let patchedProductId = patchedProduct["id"];
      products[patchedProductId] = patchedProduct;
      setPriceColor(patchedProductId, patchedProduct["visynet_max_price"] || 0);
      setButtonsForProduct(patchedProductId, [
        {
          backgroundColor: "grey",
          link: getAmazonLink(patchedProduct["asin"]),
        },
        {
          backgroundColor: "grey",
          functionToExecute: () => createPopup(currentProduct),
        },
      ]);

      alert("Product saved successfully!"); // Alert the user
    } catch (error) {
      console.error("An error occurred:", error);
      alert("An error occurred while saving the product. Please try again."); // Alert the user
    }
  };

  const closeButton = document.createElement("button");
  closeButton.textContent = "Schließen";
  closeButton.onclick = function () {
    document.body.removeChild(popup);
    document.body.removeChild(overlay);
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
    let priceNodes = Array.from(priceElement.childNodes);
    let prices = priceNodes
      .filter(
        (node) =>
          node.nodeType === Node.TEXT_NODE ||
          node.nodeType === Node.ELEMENT_NODE
      )
      .map((node) =>
        parseFloat(node.textContent.replace(/[^0-9.,]/g, "").replace(",", "."))
      );
    // Use the last price (i.e., the second price if it exists)
    let price = prices[prices.length - 1];

    let color = "";
    if (price < comparePrice) {
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

function setButtonsForProduct(id, buttons) {
  let li = getLiItemById(id);
  let buttonsContainer = getButtonContainer(buttons);
  buttonsContainer.id = "buttons-container";
  let exisingButtonsContainer = li.querySelector("#buttons-container");
  if (!exisingButtonsContainer) {
    li.appendChild(buttonsContainer);
  } else {
    exisingButtonsContainer.replaceWith(buttonsContainer);
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

async function getProductsById(listOfIds) {
  try {
    const reponse = await fetch(API_BASE_URL + "products", {
      method: "GET",
      headers: HEADERS,
      data: JSON.stringify({ product_ids: listOfIds }),
    });
    const data = await reponse.json();
    return data.products;
  } catch (error) {
    console.error("Error while fetching all products:", error);
  }
}

async function main() {
  let debounceTimeout;
  const debouncedObserverCallback = async function () {
    clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(async function () {
      let latestIds = getLatestIds();
      products = await getProductsById(latestIds);
      for (const productId of latestIds) {
        let currentLiItem = getLiItemById(productId);
        let currentProduct = products[productId] || {};
        let productTitle = extractProductTitle(currentLiItem);
        let originalNumber = extractOriginalNumber(currentLiItem);
        setPriceColor(productId, currentProduct.visynet_max_price || 0);

        if (!products.hasOwnProperty(productId)) {
          let product = await writeProductToDB(
            productId,
            productTitle,
            originalNumber
          );
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
