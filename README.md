# Access Mars
[Access Mars](https://accessmars.withgoogle.com) is a collaboration between NASA, Jet Propulsion Lab, and Google Creative Lab to bring the real surface of Mars to your browser. It is an open source project released as a [WebVR Experiment](http://webvrexperiments.com).

![alt text](https://accessmars.withgoogle.com/img/fbshare.jpg "Access Mars")

This is an experiment, not an official Google product. We will do our best to support and maintain this experiment but your mileage may vary.

### Background
The Curiosity rover has been on the surface of Mars for over five years. In that time, it has sent over 200,000 photos back to Earth. Using these photos, engineers at JPL have reconstructed the 3D surface of Mars for their scientists to use as a mission planning tool – surveying the terrain and identifying geologically significant areas for Curiosity to investigate further. And now you can explore the same Martian surface in your browser in an immersive WebVR experience.

Access Mars features four important mission locations: the Landing Site, Pahrump Hills, Marias Pass, and Murray Buttes. Additionally, users can visit Curiosity's "Current Location" for a look at where the rover has been in the past two to four weeks. And while you explore it all, JPL scientist Katie Stack Morgan will be your guide, teaching you about key mission details and highlighting points of interest.

### Interaction Models
Access Mars supports Desktop 360, Mobile 360, Cardboard, Daydream, GearVR, Oculus, and Vive.

Users use their primary interaction mode (mouse, finger, Cardboard button, etc.) to:

* learn about the Curiosity mission by clicking points of interest and highlighted rover parts.
* move from point to point by clicking on the terrain.
* travel to different mission sites by clicking the map icon.

6DOF users can use their room scale environments to explore on foot.

### Technologies
Access Mars is built with [A-Frame](https://github.com/aframevr/aframe), [Three.js](https://github.com/mrdoob/three.js/), and [glTF](https://github.com/KhronosGroup/glTF) with [Draco](https://github.com/google/draco) mesh compression.

Our fork of Three.js implements a progressive JPEG decoding scheme originally outlined in this [paper](https://github.com/bompo/streamingtextures/blob/master/JPEGStreaming.pdf) by Stefan Wagner. We load low-resolution textures initially, then high-resolution textures are loaded in the background as the user explores. The textures closest to the user are updated first.

These high-resolution textures are loaded using the progressive decoding scheme, which allows us to load a large texture without disrupting the render thread. An empty texture of the correct size is allocated before the rendering process begins. This avoids the usual stutter experienced when allocating a new texture during runtime. The desired JPEG is then decoded in 32x32 blocks of pixels at a time, and this data is sent to the texture we allocated earlier. Using the [texSubImage2D](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texSubImage2D) function, only the relevant 32x32 portion of the texture is updated at once. The decoding itself is done in a [WebWorker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API), which uses an [emscripten](https://github.com/kripken/emscripten) version of [libjpeg](http://ijg.org/) to decode the JPEG manually.

### Building
Install node and browserify if you haven't already `npm install`

Running `npm run start` will spin up a local Budo server for development. The URL will be given in the terminal.

### Contributors
This is not an official Google product, but an experiment that was a collaborative effort by friends from [NASA JPL Ops Lab](https://opslab.jpl.nasa.gov/) and Creative Lab.
* [Jeremy Abel](https://github.com/jeremyabel)
* [Manny Tan](https://github.com/mannytan)
* [Ryan Burke](https://github.com/ryburke)
* [Kelly Ann Lum](https://github.com/kellyannl)
* [Alex Menzies](https://github.com/amenzies)
