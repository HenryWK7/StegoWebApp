let content = "Home";
async function hideFile() {
    const imageInput = document.getElementById("imageInput").files[0];
    const fileInput = document.getElementById("fileInput").files[0];

    if (!imageInput || !fileInput) {
        alert("Please select both an image and a file.");
        return;
    }

    const image = await loadImage(imageInput);
    const fileData = await fileToUint8Array(fileInput);
    const fileExt = fileInput.name.split('.').pop(); // Get file extension
    const fileExtBytes = new TextEncoder().encode(fileExt + '\0'); // Convert extension to bytes
    const fullData = new Uint8Array([...fileExtBytes, ...fileData]); // Combine extension + file

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.style.display = "block";
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Check if image has enough space for the file
    if (fullData.length * 8 + 32 > pixels.length) {
        alert("File is too large to hide in this image! Use a larger PNG.");
        return;
    }

    // Store file size in the first 32 pixels
    const fileSize = fullData.length;
    for (let i = 0; i < 32; i++) {
        pixels[i * 4] = (pixels[i * 4] & 0xFE) | ((fileSize >> (31 - i)) & 1);
    }

    // Store file data in the image pixels
    for (let i = 0; i < fullData.length; i++) {
        for (let bit = 0; bit < 8; bit++) {
            const pixelIndex = (i * 8 + bit + 32) * 4;
            pixels[pixelIndex] = (pixels[pixelIndex] & 0xFE) | ((fullData[i] >> (7 - bit)) & 1);
        }
    }

    ctx.putImageData(imageData, 0, 0);
    const encodedImage = canvas.toDataURL("image/png");

    // Create download link
    const link = document.getElementById("downloadLink");
    link.href = encodedImage;
    link.download = "encoded-image.png";
    link.innerText = "Download Encoded Image";
    link.style.display = "block";
}

async function extractFile() {
    const encodedImageInput = document.getElementById("encodedImageInput").files[0];

    if (!encodedImageInput) {
        alert("Please upload an encoded image.");
        return;
    }

    const image = await loadImage(encodedImageInput);
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Extract file size from the first 32 pixels
    let fileSize = 0;
    for (let i = 0; i < 32; i++) {
        fileSize = (fileSize << 1) | (pixels[i * 4] & 1);
    }

    if (fileSize <= 0 || fileSize * 8 + 32 > pixels.length) {
        alert("Error: No hidden file detected or corrupted image.");
        return;
    }

    // Extract file data from pixels
    const extractedData = new Uint8Array(fileSize);
    for (let i = 0; i < fileSize; i++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
            const pixelIndex = (i * 8 + bit + 32) * 4;
            byte = (byte << 1) | (pixels[pixelIndex] & 1);
        }
        extractedData[i] = byte;
    }

    // Extract the file extension
    let extEnd = 0;
    while (extEnd < fileSize && extractedData[extEnd] !== 0) {
        extEnd++;
    }
    const fileExt = new TextDecoder().decode(extractedData.slice(0, extEnd)); // Get extension
    const fileContent = extractedData.slice(extEnd + 1); // Get actual file data

    // Create and download the extracted file with the correct extension
    const blob = new Blob([fileContent], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-file." + fileExt; // Automatically name file
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function loadImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function fileToUint8Array(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(new Uint8Array(e.target.result));
        };
        reader.readAsArrayBuffer(file);
    });
}

function showContent(newContent) {
    document.getElementById(content).style.display = "none";
    document.getElementById(newContent).style.display = "block";
    content = newContent;
}
