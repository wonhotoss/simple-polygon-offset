import {diff} from 'martinez-polygon-clipping'

type xy = [number, number];

function get_winding_number(polygon: xy[]){
    let sum = 0;
    for(let i = 0; i < polygon.length; ++i){
        let xy = polygon[i];
        let next = polygon[(i + 1) % polygon.length];
        sum += (next[0] - xy[0]) * (next[1] + xy[1]);
    }
    return sum;
}

type segment = {from: xy, to: xy};

function lineSegmentsIntersect(e0: segment, e1: segment): xy{
    let x1 = e0.from[0];
    let y1 = e0.from[1];
    let x2 = e0.to[0];
    let y2 = e0.to[1];
    let x3 = e1.from[0];
    let y3 = e1.from[1];
    let x4 = e1.to[0];
    let y4 = e1.to[1];        
    var a_dx = x2 - x1;
    var a_dy = y2 - y1;
    var b_dx = x4 - x3;
    var b_dy = y4 - y3;
    var s = (-a_dy * (x1 - x3) + a_dx * (y1 - y3)) / (-b_dx * a_dy + a_dx * b_dy);
    var t = (+b_dx * (y1 - y3) - b_dy * (x1 - x3)) / (-b_dx * a_dy + a_dx * b_dy);
    // console.log(s, t);    
    return [x1 + t * a_dx, y1 + t * a_dy];    
}

function scale(p: xy, s: number): xy{
    return [
        p[0] * s,
        p[1] * s,
    ];
}

function add(p0: xy, p1: xy): xy{
    return [
        p0[0] + p1[0],
        p0[1] + p1[1],
    ];
}

function subtract(p0: xy, p1: xy): xy{
    return [
        p0[0] - p1[0],
        p0[1] - p1[1],
    ];
}

function magnitude(p: xy): number{
    return Math.sqrt(p[0] * p[0] + p[1] * p[1]);
}

function normalize(p: xy): xy{
    return scale(p, 1 / magnitude(p));
}


const segment_inout = (e: segment, width: number) => {    
    let diff = subtract(e.to, e.from);
    let normalized = normalize(diff);
    let rotated: xy = [-normalized[1], normalized[0]];
    let back = subtract(e.from, scale(normalized, width));
    let foward = add(e.to, scale(normalized, width));
    return {
        in: {from: add(back, scale(rotated, width)), to: add(foward, scale(rotated, width))},
        self: e,
        out: {from: add(back, scale(rotated, -width)), to: add(foward, scale(rotated, -width))},
    };
};


export default function offset(polygon: xy[], width: number){
    // collect every convex points
    let convex_indice = [] as number[];
    for(let i = 0; i < polygon.length; ++i){
        let idx = polygon.length + i;
        let p0 = polygon[(idx - 1) % polygon.length];
        let p1 = polygon[idx % polygon.length];
        let p2 = polygon[(idx + 1) % polygon.length];
        
        if(get_winding_number([p0, p1, p2]) < 0){
            convex_indice.push(i);
        }
    }

    console.assert(convex_indice.length >= 2);

    let edge_lists = [] as segment[][];

    for(let i = 0; i < convex_indice.length; ++i){
        let convex_index = convex_indice[i];
        let next_convex_indice = convex_indice[(i + 1) % convex_indice.length];

        let from = convex_index;
        let to = (from + 1) % polygon.length;

        let edge_list = [] as segment[];

        while(from != next_convex_indice){
            edge_list.push({from: polygon[from], to: polygon[to]});
            from = to;
            to = (from + 1) % polygon.length;
        }

        edge_lists.push(edge_list);
    }

    console.log('edge_lists', edge_lists);

    let masks = [] as xy[][];

    for(let edge_list of edge_lists){
        let segments = edge_list.map(e => segment_inout(e, width));

        let mask = [] as xy[];

        mask.push(segments[0].in.from);

        for(let i = 0; i < edge_list.length - 1; ++i){
            let s0 = segments[i];
            let s1 = segments[i + 1];
            mask.push(lineSegmentsIntersect(s0.in, s1.in));
        }

        mask.push(segments[segments.length - 1].in.to);

        mask.push(segments[segments.length - 1].out.to);

        for(let i = 0; i < edge_list.length - 1; ++i){
            let s0 = segments[edge_list.length - 1 - i];
            let s1 = segments[edge_list.length - 1 - i - 1];
            mask.push(lineSegmentsIntersect(s0.out, s1.out));
        }

        mask.push(segments[0].out.from);

        masks.push(mask);
    }

    console.log('masks', masks);

    // aware Symbol.isConcatSpreadable
    let mask_coords = masks.map(m => m.concat([m[0]]));
    let coords = [polygon.concat([polygon[0]])];
    
    for(let mask of mask_coords){
        console.log(coords, [mask]);
        coords = diff(coords, [mask]) as xy[][];        
        console.log(coords);
    }    

    let result = [] as xy[][];

    for(let arr0 of coords as any as number[][][][]){
        for(let arr1 of arr0){
            result.push(arr1.slice(0, -1) as xy[]);            
        }
    }

    return {
        masks,
        result
    };
}