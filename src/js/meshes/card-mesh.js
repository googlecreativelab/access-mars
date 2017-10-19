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
 * CardMesh
 *
 * Class which contains the backing mesh used by the info-card and map-card components.
 * Encapsulates mesh setup and management of transition animations.
 */

import { EventEmitter } from 'eventemitter3';
import { MathUtils } from '../utils/math-utils';

const BezierEasing = require( 'bezier-easing' );
const InfoCardShader = require( '../shaders/info-card-flat-shader' );

const PLANE_GEO = new THREE.PlaneBufferGeometry( 1, 1 );

export class CardMesh extends EventEmitter {

	constructor( width, height, depthTest ) {
		super();

		this.easing = BezierEasing( 0.66, 0, 0.33, 1 );
		this.animIn = 0;
		this.delay = 0;
		this.delayCounter = 0;

		this.visible = false;
		this.hideComplete = false;

		// Create InfoCardShader material
		this.material = new THREE.ShaderMaterial({
			uniforms: THREE.UniformsUtils.clone( InfoCardShader.uniforms ),
			vertexShader: InfoCardShader.vertexShader,
			fragmentShader: InfoCardShader.fragmentShader
		});

		// Disable depth test if required
		if ( depthTest === false || depthTest === undefined ) {
			this.material.depthTest = false;
			this.material.transparent = true;
		}

		// Set material uniforms
		this.material.uniforms.animIn.value = this.animIn;
		this.material.uniforms.color.value = new THREE.Color( 0xFFFFFF );

		// Create and scale the plane mesh
		this.mesh = new THREE.Mesh( PLANE_GEO, this.material );
		this.mesh.scale.setX( width );
		this.mesh.scale.setY( height || width );
	}

	setVisibility( visibility, duration, delay ) {
		if ( visibility ) {
			this.show( duration, delay );
		} else {
			this.hide( duration );
		}
	}

	show( duration, delay ) {
		if ( this.visible ) return;
		this.setTimings( duration, delay );
		this.animIn = 0;
		this.visible = true;
	}

	hide( duration, delay ) {
		if ( !this.visible ) return;
		this.setTimings( duration, delay );
		this.visible = false;
		this.hideComplete = false;
	}

	setTimings( duration, delay ) {
		this.transitionDuration = duration === undefined ? 0.25 : duration;
		this.delay = delay === undefined ? 0 : delay;
		this.delayCounter = this.delay ? 1 : 0;
	}

	setSize( width, height ) {
		this.mesh.scale.setX( width );
		this.mesh.scale.setY( height || width );
	}

	setPosition( x, y ) {
		this.mesh.position.setX( x );
		this.mesh.position.setY( y );
	}

	setDepth( depth ) {
		this.mesh.position.setZ( depth );
	}

	getX() {
		return this.mesh.position.x;
	}

	getY() {
		return this.mesh.position.y;
	}

	tick( dt ) {
		// Scale delta-time so that it is a number from 0..1 over the 
		// number of seconds set by transitionDuration.
		if ( this.delayCounter > 0 ) {
			dt = ( dt / 1000 ) * ( 1 / this.delay );
		} else {
			dt = ( dt / 1000 ) * ( 1 / this.transitionDuration );
		}

		if ( this.delayCounter > 0 ) {
			this.delayCounter -= dt; 
			return;
		}

		if ( this.visible ) {
			this.animIn += dt;
		} else {
			this.animIn -= dt;
		}

		this.animIn = MathUtils.clamp( this.animIn, 0, 1 );
		this.material.uniforms.animIn.value = this.easing( this.animIn );

		// Emit hide-complete event when the out animation is completed
		if ( !this.hideComplete && this.animIn <= 0 ) {
			this.hideComplete = true;
			this.emit( 'hide-complete' );
		}
	}
}