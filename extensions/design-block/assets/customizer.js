// ==========================
// Fabric Canvas
// ==========================


const canvas = new fabric.Canvas("designCanvas", {
    preserveObjectStacking: true,
    selection: true
});



// Product Images
const productImages = window.productCustomizer.images || [];

// Store objects for each side
let currentSide = "front";

let frontDesign = [];
let backDesign = [];

// ==========================
// Load Initial Product Image
// ==========================

loadProductImage(0);

// ==========================
// Save Current Side
// ==========================

function saveCurrentDesign() {

    const objects = canvas
        .getObjects()
        .filter(obj => !obj.excludeFromExport);

    const json = objects.map(obj => obj.toObject());

    if (currentSide === "front") {
        frontDesign = json;
    } else {
        backDesign = json;
    }

}

// ==========================
// Restore Side
// ==========================

function restoreCurrentDesign() {

    const design =
        currentSide === "front"
            ? frontDesign
            : backDesign;

    fabric.util.enlivenObjects(design, function (objects) {

        objects.forEach(function (obj) {

            canvas.add(obj);

        });

        canvas.requestRenderAll();

    });

}

// ==========================
// Load Product Background
// ==========================

function loadProductImage(index) {

    if (!productImages[index]) return;

    canvas.clear();

    fabric.Image.fromURL(productImages[index], function (img) {

        const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
        );

        img.scale(scale);

        img.selectable = false;
        img.evented = false;
        img.excludeFromExport = true;

        canvas.setBackgroundImage(
            img,
            function () {

                restoreCurrentDesign();

                canvas.requestRenderAll();

            },
            {
                originX: "center",
                originY: "center",
                left: canvas.width / 2,
                top: canvas.height / 2
            }
        );

    }, {
        crossOrigin: "anonymous"
    });

}

// ==========================
// Front View
// ==========================

document.getElementById("frontView").addEventListener("click", function () {

    saveCurrentDesign();

    currentSide = "front";

    loadProductImage(0);

});

// ==========================
// Back View
// ==========================

document.getElementById("backView").addEventListener("click", function () {

    saveCurrentDesign();

    currentSide = "back";

    loadProductImage(1);

});

// ==========================
// Upload Logo
// ==========================

document.getElementById("uploadImage").addEventListener("change", function (e) {

    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {

        fabric.Image.fromURL(event.target.result, function (img) {

            img.set({

                left: 150,
                top: 150,

                scaleX: 0.30,
                scaleY: 0.30,

                borderColor: "#0d6efd",
                cornerColor: "#0d6efd",
                cornerSize: 10,
                transparentCorners: false

            });

            canvas.add(img);

            canvas.setActiveObject(img);

            canvas.requestRenderAll();

        });

    };

    reader.readAsDataURL(file);

});

// ==========================
// Add Text
// ==========================

document.getElementById("addText").addEventListener("click", function () {

    const value = document.getElementById("customText").value.trim();

    if (!value) return;

    const text = new fabric.IText(value, {

        left: 180,
        top: 180,

        fontSize: 32,

        fill: document.getElementById("textColor").value,

        fontFamily: "Arial",

        borderColor: "#0d6efd",
        cornerColor: "#0d6efd",
        cornerSize: 10,
        transparentCorners: false

    });

    canvas.add(text);

    canvas.setActiveObject(text);

    canvas.requestRenderAll();

});

// ==========================
// Delete Selected
// ==========================

document.getElementById("deleteObject").addEventListener("click", function () {

    const obj = canvas.getActiveObject();

    if (!obj) {

        alert("Please select an object.");

        return;

    }

    canvas.remove(obj);

    canvas.discardActiveObject();

    canvas.requestRenderAll();

});

// ==========================
// Delete Key
// ==========================

document.addEventListener("keydown", function (e) {

    if (e.key !== "Delete") return;

    const obj = canvas.getActiveObject();

    if (!obj) return;

    canvas.remove(obj);

    canvas.discardActiveObject();

    canvas.requestRenderAll();

});










// ==========================
// Convert DataURL -> Blob
// ==========================

function dataURLtoBlob(dataurl) {

    const arr = dataurl.split(",");

    const mime = arr[0].match(/:(.*?);/)[1];

    const bstr = atob(arr[1]);

    let n = bstr.length;

    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });

}

// ==========================
// Upload Design
// ==========================

async function uploadDesign() {

    const mergedImage = canvas.toDataURL({
        format: "png",
        quality: 1
    });

    const uploadUrls = [
        "/apps/image-merger/upload-img",
        "/upload-img"
    ];

    let lastError = null;

    for (const url of uploadUrls) {

        const formData = new FormData();

        formData.append(
            "file",
            dataURLtoBlob(mergedImage),
            `design-${Date.now()}.png`
        );

        formData.append("folder", "shopify-designs");

        console.log("Uploading to:", url);

        try {
            const response = await fetch(url, {
                method: "POST",
                body: formData
            });

            const text = await response.text();
            let payload = null;

            try {
                payload = text ? JSON.parse(text) : null;
            } catch (parseError) {
                payload = { raw: text };
            }

            console.log("Status:", response.status);
            console.log("Response body:", payload);

            if (!response.ok) {
                throw new Error(payload?.error || payload?.message || "Upload failed");
            }

            return payload;
        } catch (err) {
            lastError = err;
            console.error(`Upload failed for ${url}:`, err);
        }

    }

    throw lastError || new Error("Upload failed");

}

// ==========================
// Shopify Product Form
// ==========================

function ensureHiddenInput(form, name, value = "") {

    let input = form.querySelector(`input[name="${name}"]`);

    if (!input) {

        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        form.appendChild(input);

    }

    input.value = value;

    return input;
}

function showUploadStatus(message, isError = false) {

    let modal = document.getElementById("image-merger-upload-modal");

    if (!modal) {

        modal = document.createElement("div");
        modal.id = "image-merger-upload-modal";
        modal.style.cssText = "position: fixed; inset: 0; background: rgba(17, 24, 39, 0.55); display: flex; align-items: center; justify-content: center; z-index: 999999; padding: 20px;";

        const panel = document.createElement("div");
        panel.style.cssText = "width: min(560px, 100%); background: #ffffff; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); padding: 20px; border: 1px solid #e5e7eb;";

        const title = document.createElement("div");
        title.id = "image-merger-upload-title";
        title.style.cssText = "font-size: 18px; font-weight: 700; margin-bottom: 10px;";

        const body = document.createElement("div");
        body.id = "image-merger-upload-body";
        body.style.cssText = "font-size: 14px; line-height: 1.5; word-break: break-all; color: #374151; margin-bottom: 14px;";

        const actions = document.createElement("div");
        actions.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap;";

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.textContent = "Copy URL";
        copyButton.style.cssText = "padding: 8px 12px; border: 0; border-radius: 6px; background: #2563eb; color: #ffffff; cursor: pointer;";
        copyButton.addEventListener("click", async function () {
            const text = body.textContent || "";
            if (text) {
                try {
                    await navigator.clipboard.writeText(text);
                    copyButton.textContent = "Copied";
                    setTimeout(() => {
                        copyButton.textContent = "Copy URL";
                    }, 1500);
                } catch (err) {
                    console.error(err);
                }
            }
        });

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.textContent = "Close";
        closeButton.style.cssText = "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #ffffff; color: #111827; cursor: pointer;";
        closeButton.addEventListener("click", function () {
            modal.style.display = "none";
        });

        actions.appendChild(copyButton);
        actions.appendChild(closeButton);

        panel.appendChild(title);
        panel.appendChild(body);
        panel.appendChild(actions);
        modal.appendChild(panel);
        document.body.appendChild(modal);

        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });

    }

    const titleNode = document.getElementById("image-merger-upload-title");
    const bodyNode = document.getElementById("image-merger-upload-body");

    if (titleNode) {
        titleNode.textContent = isError ? "Upload failed" : "Design uploaded";
        titleNode.style.color = isError ? "#b91c1c" : "#065f46";
    }

    if (bodyNode) {
        bodyNode.textContent = message;
    }

    modal.style.display = "flex";

}

function attachProductFormHandler() {

    const productForm = document.querySelector(
        'form[data-type="add-to-cart-form"], form[action*="/cart/add"], form[action*="/cart"], form[id*="product-form"]'
    );

    if (!productForm || productForm.dataset.customizerBound === "true") {
        return false;
    }

    const designInput = ensureHiddenInput(productForm, "properties[Custom Design]");
    const designImageInput = ensureHiddenInput(productForm, "properties[Custom Design Image]");
    const designerInput = ensureHiddenInput(productForm, "properties[Designer]", "Image Merger");

    console.log("Product form found:", productForm);
    console.log("Hidden inputs ensured:", {
        designInput,
        designImageInput,
        designerInput
    });

    let isSubmitting = false;

    productForm.addEventListener("submit", async function (e) {

        console.log("Submit fired");

        if (isSubmitting) return;

        e.preventDefault();

        isSubmitting = true;

        try {

            const upload = await uploadDesign();

            console.log(upload);

            designInput.value = upload.url;
            designImageInput.value = upload.url;
            designerInput.value = "Image Merger";

            window.__imageMergerLastUpload = upload;
            window.dispatchEvent(new CustomEvent("image-merger:upload-complete", { detail: upload }));

            showUploadStatus(`Upload successful. ${upload.url}`);

            console.log("Custom values prepared", {
                design: designInput.value,
                image: designImageInput.value,
                designer: designerInput.value
            });

        } catch (err) {

            console.error(err);
            showUploadStatus(`Upload failed: ${err.message || err}`, true);
            isSubmitting = false;

        }

    });

    productForm.dataset.customizerBound = "true";

    return true;
}

let attachAttempts = 0;

function initializeProductFormHandler() {

    if (attachProductFormHandler()) {
        return;
    }

    attachAttempts += 1;

    if (attachAttempts < 20) {
        window.setTimeout(initializeProductFormHandler, 250);
    }

}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeProductFormHandler);
} else {
    initializeProductFormHandler();
}
