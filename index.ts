
// This demo contrasts thinning done via a scale axis transform method and
// thinning (also called erosion) done by the standard built-in morphology SVG 
// filter.
//
// The medial and scale axis transform libraries can be found on GitHub 
// here https://github.com/FlorisSteenkamp/MAT.
// The demo is also available on GitHub under the examples at
// https://github.com/FlorisSteenkamp/mat-examples

import './style.css'; // Import stylesheets

import { findMats, getPathsFromStr, Mat, toScaleAxis } from 'flo-mat';

import { addPath } from './src/svg-functions';
import { getThinnedPath } from './src/get-thinned-path';
import { getPathStrs } from './src/get-path-strs';
import { createSelectOptions } from './src/create-select-options';


(function() {
    // Get the path strings for the letter glyphs.
    const SVG_PATH_STRS = getPathStrs();

    // Get a handle on some SVG elements from the DOM.
    let $svg: SVGSVGElement = (document.getElementById('svg')) as any;
    let $svgErode: SVGSVGElement = (document.getElementById('svg-erode')) as any;
    let $gErode: SVGGElement = (document.getElementById('g-erode')) as any;

    // Get / create some more html elements
    let $shapeSelect = document.getElementById('shape-select');
    let $thinSlider  = document.getElementById('thin-slider');
    let $erodeSlider = document.getElementById('erode-slider');
    createSelectOptions($shapeSelect, SVG_PATH_STRS);

    // Our path objects
    let $shapeThinOutline: SVGPathElement;    
    let $shapeThin: SVGPathElement;
    let $shapeErodeOutline: SVGPathElement;
    let $shapeErode: SVGPathElement;

    // The medial axis transforms
    let mats: Mat[];
    let sats: Mat[] = [];

    // The scale axis transform parameter
    let s = 2.5;

    // The letter shape at its thickest
    let thickestWidth: number;

    // Set slider and select change events
    $shapeSelect.onchange = onShapeChanged;
    $thinSlider.oninput = onThinPercentChanged;
    $erodeSlider.oninput = erodeSliderChanged;
    

    onShapeChanged();


    /**
     * Called when initially and when a different letter was selected
     */
    function onShapeChanged() {
        // Remove prior SVGs
        if ($shapeThinOutline) { $shapeThinOutline.remove(); }
        if ($shapeThin) { $shapeThin.remove(); }        
        if ($shapeErodeOutline) { $shapeErodeOutline.remove(); }
        if ($shapeErode) { $shapeErode.remove(); }

        // Get new SVG path according to user selection
        let svgPathStr = SVG_PATH_STRS[
            ($shapeSelect as HTMLSelectElement).value
        ];

        // Get the array of bezier loops from the SVG path string
        let bezierLoops = getPathsFromStr(svgPathStr);

        // Get their medial axis transforms
        mats = findMats(bezierLoops, 10);

        // Get their scale axis transforms
        sats = mats.map(mat => toScaleAxis(mat, s));

        // Get new thickest width
        thickestWidth = 0;
        sats.forEach(sat => {
            let r = sat.cpNode.cp.circle.radius;
            if (r > thickestWidth) { thickestWidth = r; }
        });


        // Add new SVG paths
        $shapeThinOutline = addPath($svg, svgPathStr, 'shape-path');
        $shapeErodeOutline = addPath($svgErode, svgPathStr, 'shape-path');
        $shapeErode = addPath($gErode, svgPathStr, 'shape-path-erode');

        // Update viewboxes to fit letters to display
        let bb = $svg.getBBox();
        let viewBox = `${bb.x} ${bb.y} ${bb.width} ${bb.height}`;
        $svg.setAttributeNS(null, 'viewBox', viewBox);
        $svgErode.setAttributeNS(null, 'viewBox', viewBox);
        
        onThinPercentChanged();
        erodeSliderChanged();
    }


    /**
     * Fires when the thinning percentage changed via the slider
     */
    function onThinPercentChanged() {
        // Remove old thin path
        if ($shapeThin) { $shapeThin.remove(); }

        // Get new thin fraction
        let thinFraction = (($thinSlider as any).value) / 100;

        // Get new path string
        let pathStr = getThinnedPath(sats, thinFraction);

        // Update SVG path
        $shapeThin = addPath($svg, pathStr, 'thin');
    }


    function erodeSliderChanged() {
        // Get erosion fraction
        let erodeFraction = ($erodeSlider as any).value / 100;
        // Get erosion radius
        let erodeRadius = thickestWidth * erodeFraction;

        // Update SVG morphology filter erosion radius
        let $feErode = document.getElementById('fe-erode');
        $feErode.setAttributeNS(null, 'radius', erodeRadius.toString())
    }
})();


    let vertices: number[][] = [];
    for (let i=0; i<n; i++) {
        let θ = i*2*Math.PI/n;
        let x = c[0] + r*Math.sin(θ);
        let y = c[1] + r*Math.cos(θ);
        //if (x < 0 && Math.abs(x) > 0.1) { x -= stretch }
        //if (x > 0 && Math.abs(x) > 0.1) { x += stretch }
        vertices.push([x, y]);
    }

    let pathStr = '';
    let prefix = 'M';
    for (let vertex of vertices) {
        pathStr += `${prefix}${vertex[0]} ${vertex[1]} \n`;
        prefix = 'L';
    }
    pathStr += 'z';

    return pathStr;
}

/**
 * Returns an SVG path string of a line.
 * @param ps The line endpoints.
 */
function getLinePathStr(ps: number[][]) {
    let [[x0,y0],[x1,y1]] = ps;
    return `M${x0} ${y0} L${x1} ${y1}`;
}

/**
 * Returns an SVG path string of a quadratic bezier curve.
 * @param ps The quadratic bezier control points.
 */
function getQuadBezierPathStr(ps: number[][]) {
    let [[x0,y0],[x1,y1],[x2,y2]] = ps;
    return `M${x0} ${y0} Q${x1} ${y1} ${x2} ${y2}`;
}

/**
 * Returns an SVG path string of a cubic bezier curve.
 * @param ps The cubic bezier control points.
 */
function getCubicBezierPathStr(ps: number[][]) {
    let [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = ps;
    return `M${x0} ${y0} C${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
}


/**
 * Returns a function that draws an array of MAT curves on an SVG element.
 * @param mats An array of MATs to draw.
 * @param svg The SVG element on which to draw.
 * @param type The type of MAT to draw. This simply affects the class on the 
 * path element.
  */
function drawMats(
        mats: Mat[],
        svg: SVGSVGElement,
        type: 'mat' | 'sat' = 'mat') {

    mats.forEach(f);

    /**
     * Draws a MAT curve on an SVG element.
     */
     function f(mat: Mat) {
        let cpNode = mat.cpNode;
        
        if (!cpNode) { return; }

        let fs = [,,getLinePathStr, getQuadBezierPathStr, getCubicBezierPathStr];

        traverseEdges(cpNode, function(cpNode) {
            if (cpNode.isTerminating()) { return; }
            let bezier = cpNode.matCurveToNextVertex;
            if (!bezier) { return; }

            let $path = document.createElementNS(NS, 'path');
            $path.setAttributeNS(
                null, 
                "d", 
                fs[bezier.length](bezier)
            );
            $path.setAttributeNS(null, "class", type);

            svg.appendChild($path);
        });
    }
}


for (let i=3; i<12; i++) {
    let $svg = createSvg(1); // Create SVG element.
    let $path = document.createElementNS(NS, 'path'); // Create SVG path elem.
    $path.setAttribute('class', 'shape-path'); 
    $svg.appendChild($path); // Add the path element to the SVG.
    document.body.appendChild($svg); // Add the SVG to the document body.

    // Create polygon path with i vertices.
    let $d = getPolygonPathStr(i, [0,0], 75); 

    // Assign the path to the path element.
    $path.setAttributeNS(null, "d", $d);

    // Get loops (representing the shape) from the path.
    let loops = getPathsFromStr($d);
    
    /*
    let loops = [
        [
            [[50.000, 95.000],[92.797, 63.905]], 
            [[92.797, 63.905],[76.450, 13.594]],
            [[76.450, 13.594],[23.549, 13.594]],
            [[23.549, 13.594],[7.202,  63.90]],
            [[7.202,  63.900],[50.000, 95.000]]
        ]
    ];
    */
    
    // Get MATs from the loops.
    let mats = findMats(loops, 1);

    // Draw the MATs.
    drawMats(mats, $svg);
}
