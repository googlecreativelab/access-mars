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
 * rover
 *
 * Rover host component. Loads and controls the timeline for the rover
 * intro animation.
 */

import { C4DSceneManager } from '../c4d/c4d-scene-manager';
import { AudioManager } from '../core/audio-manager';
import { Scene } from '../core/scene';

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'rover', {

		dependencies: [ 'visible' ],

		init: function() {
			this.scene = new C4DSceneManager();
			this.scene.load( 'rover/scene.glb', 'rover/xref/', 'rover/tex/' ).then( sceneObject => {
				this.el.setObject3D( 'mesh', sceneObject );
				
				// Listen for the animate state and begin playback
				this.el.addEventListener( 'stateadded', event => {
					if ( event.detail.state === 'animate' ) {
						this.startAnimation();
					}

					if ( event.detail.state === 'complete' ) {
						this.jumpToEndAnimation();
					}
				});

				// If the rover is marked as being complete, jump to the end of the animation
				// once the rover is loaded.
				if ( this.el.is( 'complete' ) ) {
					this.jumpToEndAnimation();
				}

				this.el.emit( 'load-complete', null, false );
			});

			this.progress = 0;
			this.playingArmUpSound = false;
			this.playingCamClickSound = false;
			this.playingCamRotateSound = false;
			this.playingJetsSound = false;
		},

		startAnimation() {
			this.scene.play();
			this.scene.hidePartTextures();
		},

		jumpToEndAnimation() {
			this.scene.stopAtLastFrame();
			this.onSceneComplete();
		},

		tick: function( t, dt ) {
			if ( !this.el.is( 'animate' ) ) return;

			// Skip to the last frame if the skip_intro flag is set
			if ( Scene.flags.skip_intro ) {
				this.scene.tick( this.scene.duration, this.scene.duration );
				this.progress = this.scene.duration;
			} else {
				this.scene.tick( t / 1000, dt / 1000 );
			}

			// If we are skipping the intro animation, no need to play the sounds below
			if ( Scene.flags.skip_intro ) {
				this.onSceneComplete();
				return;
			}

			// SFX event: jets
			if ( this.progress > 0.1 && !this.playingJetsSound ) {
				AudioManager.playSFX( 'jets' );
				this.playingJetsSound = true;
			}

			// SFX event: arm up
			if ( this.progress > 11 && !this.playingArmUpSound ) {
				AudioManager.playSFX( 'arm_up' );
				this.playingArmUpSound = true;
			}

			// SFX event: camera click
			if ( this.progress > 17.7 && !this.playingCamClickSound ) {
				AudioManager.playSFX( 'camera' );
				this.playingCamClickSound = true;
			}

			// SFX event: camera rotate
			// if ( this.progress > 20.3 && !this.playingCamRotateSound ) {
			// 	AudioManager.playSFX( 'cam_rotate' );
			// 	this.playingCamRotateSound = true;
			// }

			// Update and check progress
			this.progress += dt / 1000;
			if ( this.progress >= this.scene.duration ) {
				this.onSceneComplete();
			}
		},

		onSceneComplete: function() {
			this.scene.showPartTextures();
			this.scene.removeObjectsWithType( 'LINES' );
			this.scene.removeObjectsWithType( 'SKYCRANE' );
			this.scene.removeObjectsWithType( 'IMAGEPLANE' );

			this.el.removeState( 'animate' );
			this.el.emit( 'complete', null, false );
		}
	});
}
