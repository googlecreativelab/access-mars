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
 * intro-player
 *
 * Intro sequencer. Waits for all the intro components to be loaded
 * and ready, then triggers the animation.
 *
 * When the animation is complete, the intro components are removed.
 *
 * Tapping on video brings up skip intro button
 * Tapping on skip intro jumps to rover landing
 *
 * All 3D objects are hidden until video is displayed
 */
import { Scene } from '../core/scene';
import { EventEmitter } from 'eventemitter3';
import { PlatformUtils } from '../utils/platform-utils';

const PRESS_AND_HOLD_TIMER = 1000;

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'intro-player', {

		init: function() {

			this.isVR = false;
			this.isVideoSkipped = false;
			this.animLoaded = false;
			this.introComplete = false;
			this.terrainLoaded = false;
			this.videoComplete = false;
			this.isControllerPressed = false;

			this.camera = document.getElementById( 'camera' );
			this.mapMarkers = document.getElementById( 'horizMarkers' );
			this.markers = document.getElementById( 'markers' );

			this.rover = Scene.createRover();

			// HACK
			// can't inject the video div so both video objects are added.
			// Removed the unsupported one
			if ( PlatformUtils.isMp4Supported() ) {
				const webmVideo = document.querySelector( '#intro-video-webm' );
				webmVideo.parentNode.removeChild( webmVideo );
				this.srcVideoId = 'intro-video-mp4';
			} else {
				const mp4Video = document.querySelector( '#intro-video-mp4' );
				mp4Video.parentNode.removeChild( mp4Video );
				this.srcVideoId = 'intro-video-webm';
			}

			this.video = document.createElement( 'a-entity' );
			this.video.setAttribute( 'intro-video', { src: this.srcVideoId } );
			this.video.setAttribute( 'geometry', { primitive: 'plane', width: 16 * 1, height: 9 * 1 });
			this.video.setAttribute( 'position', '5.00 1.6 0.0' );
			this.video.setAttribute( 'material', {
				color: '#FFF',
				src: "#" + this.srcVideoId,
				shader: 'flat',
				side: 'double'
			});

			this.skipintroHTML = document.querySelector( '#skip-intro' );
			this.holdToSkip = document.createElement( 'a-entity' );
			this.holdToSkip.setAttribute( 'position', '0.00 -0.6 -1.25 ' );
			this.holdToSkip.setAttribute( 'visible', 'false' );
			this.holdToSkip.setAttribute( 'text', {
				align: 'center',
				anchor: 'center',
				baseline: 'bottom',
				color: '#999',
				font: 'fonts/NowAlt-Medium.json',
				shader: 'msdf',
				value: 'H O L D  T O  S K I P',
			});

			this.holdToSkipBar = document.createElement( 'a-entity' );
			this.holdToSkipBar.setAttribute( 'geometry', 'primitive: plane; height: 0.005; width: 0.39;' );
			this.holdToSkipBar.setAttribute( 'material', 'color: #999;' );
			this.holdToSkipBar.setAttribute( 'position', '0.00 -0.6 -1.25 ' );
			this.holdToSkipBar.setAttribute( 'scale', { x: 0.0 } );

			if ( !AFRAME.utils.device.isMobile() ) {
				let videoEl = document.getElementById( this.srcVideoId );
				videoEl.muted = false;
			}

			Scene.on( 'terrain-loaded', event => {
				this.terrainLoaded = true;
				this.tryPlayAnimation();
			});

			this.video.addEventListener( 'video-ended', event => {
				this.videoComplete = true;
				this.tryPlayAnimation();
			});

			this.rover.addEventListener( 'load-complete', event => {
				this.animLoaded = true;
				this.tryPlayAnimation();
			});

			this.rover.addEventListener( 'complete', event => {
				this.el.removeState( 'playing-intro' );
				this.el.emit( 'intro-complete', null, false );
			});


			Scene.on( 'on-controls-ready', event => {
				if ( this.introComplete ) return;

				if( Scene.modeType === 'vr' ) {
					if( this.isVR ) { return; }
					this.skipintroHTML.setAttribute( 'class', 'invisible' );
					this.holdToSkip.setAttribute( 'visible', 'true' );
					this.isVR = true;
					this.tryAddingControllerListeners();
				} else if( Scene.modeType === '360' ) {
					if( !this.isVR ) { return; }
					this.skipintroHTML.removeAttribute( 'class' );
					this.holdToSkip.setAttribute( 'visible', 'false' );
					this.isVR = false;
					this.tryRemovingControllerListeners();
				}
			});

			this.skipintroHTML.addEventListener( 'click', this.onVideoClick.bind( this ) );

			this.camera.appendChild( this.holdToSkip );
			this.camera.appendChild( this.holdToSkipBar );
			this.el.appendChild( this.video );

			Scene.hideElements();

			this.el.addState( 'playing-intro' );
		},


		onVideoClick: function() {
			this.videoComplete = true;
			this.tryPlayAnimation();
			ga( 'send', 'event', 'video-intro', 'skipped', '' );

			if( Scene.controllerType === 'mouse-touch' ){
				this.skipintroHTML.removeAttribute( 'class' );
			} else {
				this.holdToSkip.setAttribute( 'visible', 'true' );
			}

			this.isVideoSkipped = true;
		},

		tryPlayAnimation: function() {
			if ( !this.animLoaded ) return;
			if ( !this.videoComplete ) return;
			if ( !this.terrainLoaded ) return;

			if ( this.introComplete ) return;
			this.introComplete = true;

			// Remove the video element
			let videoEl = document.getElementById( this.srcVideoId );
			videoEl.parentNode.removeChild( videoEl );
			this.el.removeChild( this.video );

			// Remove skip UI elements
			this.camera.removeChild( this.holdToSkip );
			this.camera.removeChild( this.holdToSkipBar );
			this.skipintroHTML.parentNode.removeChild( this.skipintroHTML );

			this.tryRemovingControllerListeners();

			this.el.emit( 'video-complete' );

			// Show the rover and start the animation
			this.rover.setAttribute( 'visible', true );
			this.rover.addState( 'animate' );
		},

		remove: function() {
			this.el.removeState( 'playing-intro' );
			Scene.hideRover();
		},

		tryAddingControllerListeners: function() {
			this.onControllerChangedRef = this.onControllerChanged.bind(this);
			var controller = document.getElementById( 'right-hand' );
			controller.addEventListener( 'buttonchanged', this.onControllerChangedRef );

			this.onTouchRef = this.onTouch.bind(this);

			if ( AFRAME.utils.device.isMobile() ) {
				this.el.sceneEl.addEventListener( 'touchstart', this.onTouchRef );
				this.el.sceneEl.addEventListener( 'touchend', this.onTouchRef );
			}
		},

		tryRemovingControllerListeners: function() {
			var controller = document.getElementById( 'right-hand' );
			controller.removeEventListener( 'buttonchanged', this.onControllerChangedRef );

			if ( AFRAME.utils.device.isMobile() ) {
				this.el.sceneEl.removeEventListener( 'touchstart', this.onTouchRef );
				this.el.sceneEl.removeEventListener( 'touchend', this.onTouchRef );
			}
		},

		onControllerDown: function( event ) {
			if ( this.isControllerPressed ) return;
			this.startTime = Date.now();
			this.isControllerPressed = true;
			this.timeCheck();
		},

		onControllerUp: function( event ) {
			if ( !this.isControllerPressed ) return;
			this.isControllerPressed = false;
			this.holdToSkipBar.setAttribute( 'scale', {x: 0});
		},

		onControllerChanged: function( event ) {
			if ( this.introComplete ) return;
			if ( event.detail.state.pressed ) {
				this.onControllerDown();
			} else {
				this.onControllerUp();
				let videoEl = document.getElementById( this.srcVideoId );
				if( videoEl.paused ) {
					videoEl.play();
				}
			}
		},

		onTouch: function( event ) {
			if ( this.introComplete ) return;
			switch(event.type) {
				case "touchstart":
					this.onControllerDown();
					break;
				case "touchend":
					this.onControllerUp();
					let videoEl = document.getElementById( this.srcVideoId );
					if( videoEl.paused ) {
						videoEl.play();
					}
					break;
			}
		},

		timeCheck: function() {
			this.currentTime = Date.now();
			let deltaTime = this.currentTime - this.startTime;
			let scale = (this.isControllerPressed) ? deltaTime/PRESS_AND_HOLD_TIMER : 0;
			this.holdToSkipBar.setAttribute( 'scale', {x: scale});
			if( deltaTime > PRESS_AND_HOLD_TIMER ) {
				this.isControllerPressed = false;
				this.onVideoClick();
				return;
			};

			requestAnimationFrame( () => {
				if( !this.isControllerPressed ) return;
				this.timeCheck();
			});
		}
	});
}
