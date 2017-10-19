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
 * controller-ray
 *
 * Ray line indicator for VR hand controllers.
 *
 * This replaces the parabola arc whenever the user is not holding the
 * controller button down.
 */
import { Scene } from '../core/scene';

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'controller-ray', {

		schema: {
			width: { default: 0.005 },
			length: { default: 1 }
		},

		init: function() {

			this.isInteractive = false;

			this.geometry = new THREE.PlaneBufferGeometry( this.data.width, this.data.length );
			this.geometry.rotateX( Math.PI / -2 );
			this.geometry.translate( 0, 0, this.data.length / -2 );

			this.material = new THREE.MeshBasicMaterial();
			this.mesh = new THREE.Mesh( this.geometry, this.material );
			this.el.setObject3D( 'mesh', this.mesh );
			this.el.setAttribute( 'visible', false );
			this.el.sceneEl.addEventListener( 'terrain-intersected-cleared', () => {
				if ( !this.isInteractive ) return;
				if ( Scene.controllerType === 'mouse-touch' ) return;
				this.el.setAttribute( 'visible', true );
			});

			this.el.sceneEl.addEventListener( 'terrain-intersected', () => {
				if ( !this.isInteractive ) return;
				if ( Scene.controllerType === 'mouse-touch' ) return;
				this.el.setAttribute( 'visible', false );
			});

			this.el.sceneEl.addEventListener( 'stateadded', event => {
				if ( event.detail.state === 'interactive' ) this.isInteractive = true;
				if ( event.target !== this.el.sceneEl ) return;
			});

			this.el.sceneEl.addEventListener( 'stateremoved', event => {
				if ( event.detail.state === 'interactive' ) this.isInteractive = false;
				if ( event.target !== this.el.sceneEl ) return;
			});
		},

		play: function() {

		}
	});
}
