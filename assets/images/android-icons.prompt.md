# Android adaptive icon generation

Source: `assets/images/icon.png` (preserved unchanged).

Generated with the built-in image generation tool. Foreground and monochrome layers are normalized to centered artwork on transparent 1024 × 1024 canvases. The background is an opaque 1024 × 1024 image.

## foreground

Use case: background-extraction. Edit target: supplied Anime Tracker icon. Create ONE production Android adaptive-icon FOREGROUND PNG, square 1024x1024 transparent canvas. Extract the entire existing shield/eye/scroll/compass/play/lock emblem, preserving its exact design, colors and fine painted details. Remove ONLY the star field and blue-purple background completely, including gaps around emblem. No rounded-square tile, no backdrop, no checkerboard. Center the complete emblem, uniformly scaled so it is approximately 56% canvas width and 60% canvas height, with transparent padding on every side. Every important point must fit within the centered 66/108 diameter safe circle. Preserve entire shield tip, top crest, left scroll and right play ribbon, no cropping. True alpha transparency. No new elements, text or watermark.

## background

Use case: precise-object-edit. Edit target: supplied Anime Tracker icon. Create ONE production Android adaptive-icon BACKGROUND PNG, square 1024x1024 fully opaque, edge-to-edge. Remove the entire shield, eye, scroll, compass, play ribbon, and lock emblem. Reconstruct ONLY its original blue-to-violet star-field backdrop seamlessly where the emblem was. Keep original deep navy lower region, blue upper-left and violet upper-right gradient and subtle tiny blue stars. Fully fill all corners; no rounded-square corners, transparency, border, icon, text, logos or new objects.

## monochrome

Reference image: the supplied Anime Tracker icon. Create its monochrome Android launcher companion as a flat clean WHITE vector-like emblem on a PURE SOLID BLACK background. NO transparency in this intermediate image. Solid black #000000 is vital. Simplify the shield outline, central large almond eye with iris and black pupil, upper scroll with a play triangle cutout and compass needle, and small lock beneath. Pure solid white #FFFFFF shapes, pure black negative space. NO grey, texture, grain, shading, gradients, speckles, stars or distress. The design must be clean at 48px. Keep the recognizable silhouette and arrangement of the reference, with wide transparent-equivalent BLACK negative spaces. Square 1024x1024, centered at about 60% canvas height with generous BLACK padding. No text or watermark.

Monochrome was generated on black, then luminance was converted to alpha with solid white RGB to avoid automatic background removal artifacts. Foreground and monochrome artwork were centered at no more than 574 × 600 pixels on transparent 1024 × 1024 canvases. Disconnected foreground specks were removed.
