import { Injectable, InjectionToken, Inject } from '@angular/core';
import { BehaviorSubject,Observable } from 'rxjs';
import { OpenCVLoadResult ,OpenCVOptions} from '../../assets/cv.models';

declare var cv: any;
declare global {interface Window {Module: OpenCVOptions}};


@Injectable({
  providedIn: 'root'
})
export class CvService {


  private isReady = new BehaviorSubject<OpenCVLoadResult>({
    ready: false,
    error: false,
    loading: true
  });



  isReady$: Observable<OpenCVLoadResult> = this.isReady.asObservable();
  OPENCV_URL = 'assets/asm/3.4/opencv.js';

  constructor() {

 
    const options: OpenCVOptions = {
      scriptUrl: `assets/asm/3.4/opencv.js`,
      wasmBinaryFile: 'wasm/opencv_js.wasm',
      usingWasm: false,
      locateFile: this.locateFile.bind(this),
      onRuntimeInitialized: () => { }
    };
    this.loadOpenCv();
  }


  
  loadOpenCv() {
    this.isReady.next({
      ready: false,
      error: false,
      loading: true
    });
    
    // window['Module'] = { ...options };
    const script = document.createElement('script');
    script.setAttribute('async', '');
    script.setAttribute('type', 'text/javascript');
    script.addEventListener('load', () => {
      console.log("Load event");
      this.isReady.next({
        ready: true,
        error: false,
        loading: false
      });
     
    });
    script.addEventListener('error', () => {
      const err = this.printError('Failed to load ' + this.OPENCV_URL);
      this.isReady.next({
        ready: false,
        error: true,
        loading: false
      });
      this.isReady.error(err);
    });
    script.src = this.OPENCV_URL;
    console.log("JS load");
    const node = document.getElementsByTagName('script')[0];
    if (node) {
      if(node.parentNode){
        node.parentNode.insertBefore(script, node);
      }
      
    } else {
      document.head.appendChild(script);
    }
    
  }
  
  private locateFile(path: string, scriptDirectory: string): string {
    if (path === 'opencv_js.wasm') {
      return scriptDirectory + '/wasm/' + path;
    } else {
      return scriptDirectory + path;
    }
  }
  loadImageToHTMLCanvas(imageUrl: string, canvas: HTMLCanvasElement): Observable<any> {
    return new Observable(observer => {
      const ctx = canvas.getContext('2d')!;
      const img = new Image(300,300);
      img.src = '';
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('Image load event');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        observer.next();
        observer.complete();
      };
      img.src = imageUrl;
    });
  }
  
  printError(err: any) {
    if (typeof err === 'undefined') {
      err = '';
    } else if (typeof err === 'number') {
      if (!isNaN(err)) {
        if (typeof cv !== 'undefined') {
          err = 'Exception: ' + cv.exceptionFromPtr(err).msg;
        }
      }
    } else if (typeof err === 'string') {
      const ptr = Number(err.split(' ')[0]);
      if (!isNaN(ptr)) {
        if (typeof cv !== 'undefined') {
          err = 'Exception: ' + cv.exceptionFromPtr(ptr).msg;
        }
      }
    } else if (err instanceof Error) {
      if (err.stack ){
        err = err.stack.replace(/\n/g, '<br>');
      }
      
    }
    throw new Error(err);
  }
}
