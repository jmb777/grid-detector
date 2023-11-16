import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Event, RouterOutlet } from '@angular/router';
import { CvService } from './services/cv.service';
import { filter, tap } from 'rxjs';
import { OpenCVLoadResult } from '../assets/cv.models';
import { Line } from './Classes/line';
import { Coord } from './Classes/coord.class';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnInit {

  constructor(private cvService: CvService) {

  }


  title = 'grid-detector';

  imageUrl = 'assets/images/IMG_3351.png';
  // HTML Element references

  @ViewChild('canvasInput', { static: false })
  canvasInput: ElementRef<HTMLCanvasElement> = {} as ElementRef;
  ngOnInit(): void {
    

  }


  ngAfterViewInit(): void {
    this.loadImageToHTMLCanvas(this.imageUrl, this.canvasInput.nativeElement)
  
  }
  
  loadImageToHTMLCanvas(imageUrl: string, canvas: HTMLCanvasElement){
    const ctx = canvas.getContext('2d')!;
    let img = new Image();
    img.crossOrigin = 'anonymous';
    ctx.roundRect(50,50,50,50);
    img.onload = () => {
      console.log('Image load event');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
 
    };

    img.onerror = (e)=> {console.log('error!' + e);
    };


    img.src = imageUrl;

  }

  
  test() {

    let src = cv.imread('canvasInput');
    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    let lines = new cv.Mat();
    let color = new cv.Scalar(255, 0, 0, 255);
    let color1 = new cv.Scalar(255, 255, 0, 255);
    let anchor = new cv.Point(-1, -1);
    let M = cv.Mat.ones(3, 3, cv.CV_8U);
    let startTime = Date.now();
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.Canny(src, src, 50, 200, 3);
    cv.dilate(src, src, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    
    dst = cv.imread('canvasInput');
    cv.HoughLinesP(src, lines, 2, Math.PI / 90, 200, 50, 1);
    
    console.log(`HoughlinesP rows ${lines.rows}`);
  
    let horizLines: Line[] = [];
    let vertLines: Line[] = [];
    for (let i = 0; i < lines.rows; ++i) {
   

      let dx = lines.data32S[i * 4] - lines.data32S[i * 4 + 2];
      let dy = lines.data32S[i * 4 + 1] - lines.data32S[i * 4 + 3];
      let slope = Math.abs(dx / dy);
      let vert = Math.abs(Math.tan((Math.PI / 180) * 10));
      let horiz = Math.abs(Math.tan((Math.PI / 180) * 80));
      let startPoint = new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]);
      let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);
      let row1 = lines.data32S[i * 4 + 1];
      let row2 = lines.data32S[i * 4 + 3];
      let col1 = lines.data32S[i * 4];
      let col2 = lines.data32S[i * 4 + 2];

    
      if (slope < vert) {
        let l: Line = new Line(new Coord(lines.data32S[i * 4 + 1], lines.data32S[i * 4]),
          new Coord(lines.data32S[i * 4 + 3], lines.data32S[i * 4 + 2]));
      
        vertLines.push(l);

      }
      if (slope > horiz) {
       
        let l: Line = new Line(new Coord(lines.data32S[i * 4 + 1], lines.data32S[i * 4]),
          new Coord(lines.data32S[i * 4 + 3], lines.data32S[i * 4 + 2]));
        horizLines.push(l);

      }





    }
    const sensitivity = 8;


    vertLines.forEach(vL => {
      this.findCornerAt(vertLines, horizLines, vL.p1, 8);
      this.findCornerAt(vertLines, horizLines, vL.p2, 8);
    });

  
    cv.imshow('canvasTest1', src);
    // this.detectCorners(src, dst, 40, 2, 10);
    // this.showContours(src, dst);
    let groupedCoordsList: Coord[][] = this.groupHCoords(dst.rows, horizLines, 'h');
    horizLines = [];
    groupedCoordsList.forEach(g => {
      horizLines.push(this.drawLine(g, dst, 'h'));

    });
    groupedCoordsList = this.groupHCoords(dst.cols, vertLines, 'v');
    vertLines = [];
    groupedCoordsList.forEach(g => {
      vertLines.push(this.drawLine(g, dst, 'v'));
    });
    this.showCorners(dst, horizLines, vertLines, 20);
    cv.imshow('canvasTest', dst);
    src.delete(); dst.delete(); lines.delete();

    console.log(Date.now() - startTime)

  }

  findCornerAt(vertLines: Line[], horizLines: Line[], thisCoord: Coord, sensitivity: number) {
    let color1 = new cv.Scalar(255, 255, 0, 255);
    let col = thisCoord.col;
    let row = thisCoord.row;
    let upLine = false;
    let downLine = false;

    let rightLine = false;
    let leftLine = false;
    let filteredHorizLines: Line[] = horizLines.filter(hLine => {
      if ((Math.abs(hLine.p1.row - row) < sensitivity || Math.abs(hLine.p2.row - row) < sensitivity)) { return true }
      return false;
    }
    );
    let filteredVertLines: Line[] = vertLines.filter(vLine => {
      if ((Math.abs(vLine.p1.col - col) < sensitivity || Math.abs(vLine.p2.col - col) < sensitivity)) { return true }
      return false;
    }
    );
    // console.log(`filtered horiz lines length ${filteredHorizLines.length}`);


    horizLines.forEach(hL => {
      let isCorner = true;

      filteredHorizLines.forEach(line => {
        if ((line.p1.col < col - sensitivity && line.p2.col > col + sensitivity)
          || (line.p2.col < col - sensitivity && line.p1.col > col + sensitivity)) {
          isCorner = false;
        }
      });

      filteredVertLines.forEach(line => {
        if ((line.p1.row < row - sensitivity && line.p2.row > row + sensitivity)
          || (line.p2.row < row - sensitivity && line.p1.row > row + sensitivity)) {
          isCorner = false;
        }
      });

      if (Math.abs(hL.p1.row - row) < sensitivity && Math.abs(hL.p1.col - col) < sensitivity) {

        if (isCorner) {
          let p = new cv.Point(col, row);
          // cv.circle(dst, p, 4, color1, -1);
        }

      }
      if (Math.abs(hL.p2.row - row) < sensitivity && Math.abs(hL.p2.col - col) < sensitivity) {

        if (isCorner) {
          let p = new cv.Point(col, row);
          // cv.circle(dst, p, 4, color1, -1);
        }

      }



    });



  }
  groupHCoords(length: number, hLines: Line[], dir: string): Coord[][] {

    const groupLimit = 10;
    let coordsByLine: Coord[][] = [];
    let groupedCoords: Coord[] = [];
    let groupedCoordsList: Coord[][] = [];
    let runningIndex = 0;
    for (let index = 0; index < length; index++) {
      coordsByLine.push([]);
    }
    if (dir == 'h') {
      hLines.forEach(h => {
        coordsByLine[h.p1.row].push(h.p1);
        coordsByLine[h.p2.row].push(h.p2);
      });
    }
    if (dir == 'v') {
      hLines.forEach(h => {
        coordsByLine[h.p1.col].push(h.p1);
        coordsByLine[h.p2.col].push(h.p2);
      });
    }

    for (let index = 0; index < length; index++) {
      runningIndex++;
      if (coordsByLine[index].length > 0) {
        if (runningIndex > groupLimit) {
          groupedCoordsList.push(groupedCoords);
          groupedCoords = [];
        }
        coordsByLine[index].forEach(c => {
          groupedCoords.push(c);
        });
        runningIndex = 0;
      }

    }
    if (groupedCoords.length > 0) { groupedCoordsList.push(groupedCoords); }
    if (groupedCoordsList[0].length == 0) { groupedCoordsList.splice(0, 1); }
    return groupedCoordsList;
  }

  drawLine(g: Coord[], dst: any, dir: string): Line {
    if (g.length == 0) { return null; }
    let sX = 0;
    let sY = 0;
    let sXY = 0;
    let sX2 = 0;
    let sY2 = 0;
    let n = g.length;
    let m = 0;
    let c = 0;
    let xMin = g[0].col;
    let xMax = g[0].col;
    let yMin = g[0].row;
    let yMax = g[0].row;
    let p1: any;
    let p2: any;
    let c1: Coord;
    let c2: Coord;
    if (dir == 'h') {
      g.forEach(c => {
        sX = sX + c.col;
        sY = sY + c.row;
        sXY = sXY + (c.col * c.row);
        sX2 = sX2 + c.col ** 2;
        sY2 = sY2 + c.row ** 2;
        if (c.col < xMin) { xMin = c.col; }
        if (c.col > xMax) { xMax = c.col; }
      });
      m = (n * sXY - sX * sY) / (n * sX2 - sX ** 2);
      c = (sY * sX2 - sX * sXY) / (n * sX2 - sX ** 2);
      p1 = new cv.Point(xMin, m * xMin + c);
      p2 = new cv.Point(xMax, xMax * m + c);
      c1 = new Coord(m * xMin + c, xMin);
      c2 = new Coord(m * xMax + c, xMax);
      cv.line(dst, p1, p2, [0, 255, 0, 255], 1);
    }
    if (dir == 'v') {
      g.forEach(c => {
        sX = sX + c.col;
        sY = sY + c.row;
        sXY = sXY + (c.col * c.row);
        sX2 = sX2 + c.col ** 2;
        sY2 = sY2 + c.row ** 2;
        if (c.row < yMin) { yMin = c.row; }
        if (c.row > yMax) { yMax = c.row; }
      });
      // m = (n * sXY - sX * sY) / (n * sX2 - sX ** 2);
      // c = (sY * sX2 - sX * sXY) / (n * sX2 - sX ** 2);
      m = (n * sXY - sX * sY) / (n * sY2 - sY ** 2);
      c = (sX * sY2 - sY * sXY) / (n * sY2 - sY ** 2);

      p1 = new cv.Point(m * yMin + c, yMin);
      p2 = new cv.Point(yMax * m + c, yMax);
      c1 = new Coord(yMin, m * yMin + c);
      c2 = new Coord(yMax, m * yMax + c);
      cv.line(dst, p1, p2, [0, 255, 0, 255], 1);

    }
    return new Line(c1, c2);
  }
  
  showCorners(dst: any, horizLines: Line[], vertLines: Line[], sensitivity: number) {
    let corners: Coord[][] = [];
    corners[0] = [];
    corners[1] = [];
    corners[2] = [];
    corners[3] = [];   
    horizLines.forEach(h => {
      vertLines.forEach(v => {
        if (Math.abs(h.p1.row - v.p1.row) < sensitivity && Math.abs(h.p1.col - v.p1.col) < sensitivity)
         { corners[0].push(new Coord(h.p1.row, v.p1.col)); }
        if (Math.abs(h.p2.row - v.p1.row) < sensitivity && Math.abs(h.p2.col - v.p1.col) < sensitivity)
         { corners[1].push(new Coord(h.p2.row, v.p1.col)); }
        if (Math.abs(h.p2.row - v.p2.row) < sensitivity && Math.abs(h.p2.col - v.p2.col) < sensitivity)
         { corners[2].push(new Coord(h.p2.row, v.p2.col)); }
        if (Math.abs(h.p1.row - v.p2.row) < sensitivity && Math.abs(h.p1.col - v.p2.col) < sensitivity)
         { corners[3].push(new Coord(h.p1.row, v.p2.col)); }
      });
    });
    corners.forEach((side , index)=> {
      console.log(`Corner ${index}`);
      side.forEach(c => {
        let p1 = new cv.Point(c.col, c.row)
        console.log(`Row ${c.row}, col ${c.col}`);
        cv.circle(dst, p1, 4, [0, 255, 0, 255], -1);
      });
    });
    
    let topDistances: any[] = [];
    let bottomDistances: number[];
    corners[0].forEach((a, ai) =>{
      corners[1].forEach((b, bi) =>{
        let joinDetails = {a: ai, b: bi, d: b.col - a.col} ; 

        topDistances.push(joinDetails)
      });
    });
  }
