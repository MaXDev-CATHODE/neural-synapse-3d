import os

files = [
    'package.json',
    'postcss.config.js',
    'tailwind.config.js',
    'vite.config.js',
    'index.html'
]

BOM = b'\xef\xbb\xbf'

for filename in files:
    try:
        with open(filename, 'rb') as f:
            content = f.read()
        
        if content.startswith(BOM):
            print(f"Removing BOM from {filename}")
            content = content[len(BOM):]
            with open(filename, 'wb') as f:
                f.write(content)
        else:
            print(f"No BOM in {filename}")
            
    except Exception as e:
        print(f"Error processing {filename}: {e}")
