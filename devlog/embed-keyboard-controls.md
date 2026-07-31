# Embedded keyboard controls

I noticed that the embedded experience still required a canvas click before any keyboard movement worked. Pointer Lock was doing two jobs at once: enabling mouse-look and permitting the camera update loop to process movement keys.

I separated those behaviors for embed mode. WASD, arrow keys, Space, and Shift can now move the camera without Pointer Lock, while mouse-look still requires a click because browsers require a direct user gesture for Pointer Lock. The standalone experience keeps its original click-to-move behavior.

The parent app will focus the iframe after its ready signal, so keyboard movement is available as soon as the rain appears. This keeps the entrance smooth without trying to bypass browser security. A small bend in the rules, not in the spoon.
