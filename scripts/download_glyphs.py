import urllib.request
import re
from PIL import Image
import os
import sys

def download_and_stitch():
    links_file = '../src/assets/original_glyph_image_links.txt'
    output_file = '../public/matrix-glyphs.png'
    
    if not os.path.exists(links_file):
        print(f"Could not find {links_file}")
        sys.exit(1)
        
    with open(links_file, 'r') as f:
        links = [line.strip() for line in f if line.strip()]
        
    print(f"Found {len(links)} image links.")
    
    images = []
    
    for i, link in enumerate(links):
        print(f"Downloading image {i+1}/{len(links)}...")
        try:
            req = urllib.request.Request(link, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                img_data = response.read()
                temp_filename = f'temp_glyph_{i}.png'
                with open(temp_filename, 'wb') as temp_f:
                    temp_f.write(img_data)
                
                img = Image.open(temp_filename).convert("RGBA")
                images.append(img)
                os.remove(temp_filename)
        except Exception as e:
            print(f"Failed to download image {i+1}: {e}")
            sys.exit(1)
            
    if not images:
        print("No images were downloaded.")
        sys.exit(1)
        
    width, height = images[0].size
    
    total_width = width * len(images)
    spritesheet = Image.new('RGBA', (total_width, height), (255, 255, 255, 0))
    
    for i, img in enumerate(images):
        spritesheet.paste(img, (i * width, 0))
        
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    spritesheet.save(output_file)
    
    print(f"Successfully created spritesheet at {output_file} with {len(images)} glyphs.")

if __name__ == '__main__':
    download_and_stitch()
