import base64
import re
import os

# Configuration
FILES_TO_PROCESS = [
    {
        'source': '/Users/amrmelegy/.gemini/antigravity/brain/7182b55f-d88b-4e17-9182-55eb37daae5c/TOOL_OVERVIEW.html',
        'output': '/Users/amrmelegy/.gemini/antigravity/scratch/bpo-scorecard/deliverables/TOOL_OVERVIEW_PORTABLE.html'
    },
    {
        'source': '/Users/amrmelegy/.gemini/antigravity/brain/7182b55f-d88b-4e17-9182-55eb37daae5c/USER_GUIDE.html',
        'output': '/Users/amrmelegy/.gemini/antigravity/scratch/bpo-scorecard/deliverables/USER_GUIDE_PORTABLE.html'
    }
]

def embed_images(html_content):
    # Regex to find image sources
    # Matches src="file://..." or src="/Users/..."
    pattern = r'src="(file://)?(/[^"]+\.webp)"'
    
    def replace_match(match):
        full_path = match.group(2)
        if not os.path.exists(full_path):
            print(f"Warning: Image not found: {full_path}")
            return match.group(0) # Return original if not found
            
        try:
            with open(full_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                print(f"Embedded: {os.path.basename(full_path)}")
                return f'src="data:image/webp;base64,{encoded_string}"'
        except Exception as e:
            print(f"Error embedding {full_path}: {e}")
            return match.group(0)

    return re.sub(pattern, replace_match, html_content)

try:
    for item in FILES_TO_PROCESS:
        print(f"Processing {os.path.basename(item['source'])}...")
        
        if not os.path.exists(item['source']):
            print(f"Error: Source file not found: {item['source']}")
            continue

        with open(item['source'], 'r', encoding='utf-8') as f:
            content = f.read()

        print("Embedding images...")
        new_content = embed_images(content)

        print(f"Writing to {item['output']}...")
        with open(item['output'], 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"Finished {os.path.basename(item['output'])}")

    print("All done!")

except Exception as e:
    print(f"Fatal error: {e}")
