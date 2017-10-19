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
 * MathUtils
 * 
 * Simple singleton math utility class.
 */

class StaticMathUtils {

	/**
	 * Clamps a given value between min and max
	 */
	clamp( value, min, max ) {
		return Math.min( Math.max( value, min ), max );
	}

	/**
	 * Linearly interpolates between two given values
	 */
	lerp( a, b, t ) {
		return a * ( 1 - t ) + b * t;
	}

	smooth1D( current, target, velocity, dt, smoothTime, smoothMax ) {
		const t = 2 / smoothTime;
		const t2 = t * dt;
		const cubic = 1 / ( 1 + t2 + 0.5 * t2 * t2 + 0.25 * t2 * t2 * t2 );
		const limit = smoothMax * smoothTime;
		const delta = current - target;
		const error = MathUtils.clamp( delta, -limit, limit );
		const d = ( velocity + t * error ) * dt;

		return {
			velocity: ( velocity - t * d ) * cubic,
			value: ( current - error ) + ( d + error ) * cubic
		};
	}
	
	/**
	 * Same as smooth1D(), but for THREE.Vector3s
	 */
	smooth3D( current, target, velocity, dt, smoothTime, smoothMax ) {
		const smooth = {
			x: this.smooth1D( current.x, target.x, velocity.x, dt, smoothTime, smoothMax ),
			y: this.smooth1D( current.y, target.y, velocity.y, dt, smoothTime, smoothMax ),
			z: this.smooth1D( current.z, target.z, velocity.z, dt, smoothTime, smoothMax )
		};

		velocity.x = smooth.x.velocity;
		velocity.y = smooth.y.velocity;
		velocity.z = smooth.z.velocity;

		current.x = smooth.x.value;
		current.y = smooth.y.value;
		current.z = smooth.z.value;
	}
}

export let MathUtils = new StaticMathUtils();