/**
 * jpeg-worker
 *
 * Web worker for translating decoded jpeg data into an ArrayBuffer
 * Used for loading ProgressiveTextures.
 *
 * Modified from https://github.com/bompo/streamingtextures/blob/master/worker_jpgd.js
 */

importScripts( './djpeg.js' );

onmessage = function( event ) {

	var data = readJpeg( event.data.data );
    var s = event.data.size;

	var b = new ArrayBuffer( s * s * 3 );
    var v1 = new Uint8Array( b );
    
    var i = 0,
        j = 18; // 18-byte header

    while ( i < s * s * 3 && j < ( s * s * 3 ) + 18 ) {
        v1[ i + 0 ] = data[ j + 2 ]; // R
        v1[ i + 1 ] = data[ j + 1 ]; // G
        v1[ i + 2 ] = data[ j + 0 ]; // B

        // Next pixel
        i += 3;
        j += 3;
    }

	postMessage( v1 );
};
