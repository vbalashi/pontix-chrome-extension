from PIL import Image
import os

# Load the original image
image_path = "icon_pontix_original.png"
original_image = Image.open(image_path).convert("RGBA")

# Automatically crop the image to remove excessive transparent padding
bbox = original_image.getbbox()
cropped_image = original_image.crop(bbox)

# Define icon sizes
icon_sizes = [16, 48, 96, 128]
output_paths = {}

# Resize and save each icon size
for size in icon_sizes:
    resized = cropped_image.resize((size, size), Image.LANCZOS)
    output_path = f"pontix_icon_{size}.png"
    resized.save(output_path, format="PNG")
    output_paths[size] = output_path

output_paths

