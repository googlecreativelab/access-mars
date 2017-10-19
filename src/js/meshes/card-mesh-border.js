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
 * CardMeshBorder
 *
 * Same as CardMesh, but with a extra border mesh which animates in 
 * when the hover variable is set.
 */

import { CardMesh } from './card-mesh';
import { TextColor } from '../core/colors';
import { MathUtils } from '../utils/math-utils';

const CardMeshBorderShader = require( '../shaders/card-mesh-border-shader' );

const HOVER_DURATION = 0.3;

export class CardMeshBorder extends CardMesh {

	constructor( width, height, depthTest ) {
		super( width, height, depthTest );

		this.hoverIn = 0;

		// Creat the border material
		this.borderMaterial = new THREE.ShaderMaterial({
			uniforms: THREE.UniformsUtils.clone( CardMeshBorderShader.uniforms ),
			vertexShader: CardMeshBorderShader.vertexShader,
			fragmentShader: CardMeshBorderShader.fragmentShader
		});

	 	// Disable depth test if required
		if ( depthTest === false || depthTest === undefined ) {
			this.borderMaterial.depthTest = false;
			this.borderMaterial.transparent = true;
		}

		// Set border color
		this.borderMaterial.uniforms.color.value = TextColor;

		// Create border mesh with empty geometry. The geometry will be created
		// in the setSize() function.	
		this.borderGeometry = new THREE.BufferGeometry();
		this.borderMesh = new THREE.Mesh( this.borderGeometry, this.borderMaterial );
		this.mesh.add( this.borderMesh );
	}

	setSize( width, height ) {
		super.setSize( width, height );

		const w = width;
		const h = height;
		const d = 0.001; 	// z offset
		const t = 0.04;		// border thickness

		var normals = [];

		var vertices = [
			-w, -h, d,
			-w,  h, d,
			 w, -h, d,
			 w,  h, d,

			-w + t, -h + t, d,
			-w + t,  h - t, d,
		  	 w - t, -h + t, d,
			 w - t,  h - t, d
		];

		var indices = [
			4, 5, 1,
			6, 4, 0,
			7, 6, 2,
			5, 7, 3,

			0, 4, 1,
			2, 6, 0,
			3, 7, 2,
			1, 5, 3
		];

		// The X coordinate of the UVs is used for the animIn mask effect.
		// The Y coordinate is used to animate the thickness of the border.
		var uvs = [
			1, 0.03,
			0, 0.03,
			1, 0.03,
			0, 0.03,

			1 - t, 0.99,
			0 + t, 0.99,
			1 - t, 0.99,
			0 + t, 0.99 
		];

		// Normals are constant for each vertex
		for ( var i = 0; i < 8; i++ ) {
			normals.push( 0, 0, 1 );
		}

		// Create a new BufferGeometry object and add the required attributes to it
		this.borderGeometry = new THREE.BufferGeometry();
		this.borderGeometry.setIndex( indices );
		this.borderGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		this.borderGeometry.addAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
		this.borderGeometry.addAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

		// Update the border mesh geometry
		this.borderMesh.geometry = this.borderGeometry;

		// Counteract the parent mesh's scaling
		this.borderMesh.scale.setX( 1 / this.mesh.scale.x / 2 );
		this.borderMesh.scale.setY( 1 / this.mesh.scale.y / 2 );
	}

	tick( dt ) {
		super.tick( dt );

		dt = ( dt / 1000 ) * ( 1 / HOVER_DURATION );

		if ( this.hover ) {
			this.hoverIn += dt;
		} else {
			this.hoverIn -= dt;
		}

		this.hoverIn = MathUtils.clamp( this.hoverIn, 0, 1 );

		this.borderMaterial.uniforms.animIn.value = this.easing( this.animIn );
		this.borderMaterial.uniforms.hoverIn.value = this.easing( this.hoverIn );
	}
}