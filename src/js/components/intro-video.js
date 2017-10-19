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
 * intro-video
 *
 * Simple wrapper interface for playback of the intro video
 * in a video material.
 *
 * Video materials are not fully exposed to AFRAME, but the
 * 'materialvideoloadeddata' event provides an entry point
 * to grab the video object and set any required parameters.
 */

import { Scene } from '../core/scene';

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'intro-video', {

		schema: {
			src: { type: 'string', default: 'intro-video-mp4' },
		},

		init: function() {

			this.video = document.querySelector( '#' + this.data.src );
			this.video.setAttribute( 'crossOrigin', 'anonymous' );

			this.video.addEventListener( 'ended', event => {
				this.el.emit( 'video-ended', null, false );
			});

			if ( Scene.flags.skip_intro ) {
				this.video.pause();
				this.el.emit( 'video-ended', null, false );
			}

			// // force plays video if not already playing
			// this.video.play();
			// this.tryPlayingRef = this.tryPlaying.bind(this);
			// document.addEventListener( 'click', this.tryPlayingRef );
		},

		// tryPlaying() {
		// 	this.video.play();
		// 	document.removeEventListener( 'click', this.tryPlayingRef );
		// }

	});
}
