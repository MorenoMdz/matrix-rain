# Milestone 4: The Illusion of High-Resolution Code Rain

Have you ever looked at the iconic Matrix code rain and thought, what if those falling characters weren't just random? What if they organically formed a hidden image?

That was my objective for Milestone 4. I wanted to take a standard 2D image and encode it directly into the 3D space using only falling neon-green characters. 

My first attempt was a custom InstancedMesh that sampled the image color. It worked, but it looked like a heavily pixelated mess because one character equalled one physical pixel. I tried shrinking the characters to pack more into the same space. The image looked crisp, but the frame rate tanked to an unplayable 10 FPS. I was accidentally calculating matrix transformations for half a million completely invisible characters.

I realized I didn't actually need millions of characters to trick the brain. I just needed a really good illusion.

I scaled the characters back up to fix the frame rate, and instead placed a flat plane directly behind the code rain. I wrote a custom shader that snapped to the exact grid of the characters. As an invisible mathematical wave falls down the columns, it multiplies the local color of the image, causing it to surge with brightness. 

The eye blends them together, creating the unmistakable illusion that the moving code is generating a high-resolution picture. It looks entirely cinematic and runs at a buttery 60 FPS.

Once I had the visual effect nailed, I didn't want to just stare at a static test image forever. I built a dynamic spawner that automatically scans my assets folder and cycles through characters like Neo, Morpheus, and Trinity. I implemented a shuffle bag algorithm so I never see the same image twice until all of them have had their turn.

I also wanted them to appear organically in the 3D space as I flew around. The code picks a random spot in front of my camera every 5 to 20 seconds. Instead of just popping into existence, the characters slowly fade in from the darkness. To avoid the pictures looking like cheap rectangular posters, I added a spatial noise function to the shader that creates irregular, cloud-like borders. The images naturally dissolve into the surrounding rain.

Finally, I had to be careful not to blow up the GPU memory. I set a hard cap of three active images at any time. I hooked into Three.js frustum culling so that the moment I turn my camera and look away from an image, it is completely destroyed and purged from memory. 

I learned that in graphics programming, you do not always need to brute force a solution. Sometimes the most performant answer is just a really convincing optical illusion.
