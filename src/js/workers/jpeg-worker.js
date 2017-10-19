// Copyright 2017 Google Inc.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
// limitations under the License.


/**
 * JPEGWorker
 *
 * Singleton container for the jpeg decoder worker used by the terrain component
 * for decoding jpeg textures outside of the render thread.
 */

class StaticJPEGWorker {

	constructor() {
		// Initialize jpeg worker, which is used by the ProgressiveTexture loader.
		this.worker = new Worker( 'third_party/bompo/jpeg-worker.js' );
		this.host = null;

		// Pass jpegWorker events to whatever object happens to be
		// set to the jpegWorkerHost variable. This is done to limit
		// the number of objects that can listen to events from the
		// jpeg worker, since only one object can be using the worker
		// at once.
		this.worker.onmessage = event => {
			if ( this.host ) {
				this.host.onWorkerMessage( event );
			}
		}
	}
}

export let JPEGWorker = new StaticJPEGWorker();