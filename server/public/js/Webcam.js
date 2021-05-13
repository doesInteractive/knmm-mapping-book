/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

/**
 * A class that wraps webcam video elements to capture Tensor4Ds.
 */
class Webcam {
  /**
   * @param {HTMLVideoElement} webcamElement A HTMLVideoElement representing the webcam feed.
   */
  constructor(webcamElement, rawVideoCanvas, uiCanvas, targetCanvas) {
    this.webcamElement = webcamElement
    this.rawVideoCanvas = rawVideoCanvas
    this.targetCanvas = targetCanvas
    this.uiCanvas = uiCanvas

    this.rawContext = this.rawVideoCanvas.getContext('2d')
    this.uiContext = this.uiCanvas.getContext('2d')
    this.targetContext = this.targetCanvas.getContext('2d')

    this.targetWH = 100
    this.targetX = 0
    this.targetY = 0
    this.targetRecColor = "#03a9f4"
    this.targetRecStrokeWidth = 4

    this.uiCanvas.onmousedown = this.uiCanvasDown.bind(this)
  }

  uiCanvasDown(e){
    e.preventDefault()
    e.stopPropagation()

    //mouse position
    let bounds = this.uiCanvas.getBoundingClientRect()
    const mouse = {
      x: e.pageX - bounds.left - scrollX,
      y: e.pageY - bounds.top - scrollY
    }
    mouse.x /=  bounds.width
    mouse.y /=  bounds.height
    mouse.x *= this.uiCanvas.width
    mouse.y *= this.uiCanvas.height

    this.targetX = mouse.x
    this.targetY = mouse.y

    this.drawDraggable()
  }

  /**
   * Get the last known webcam target position
   */
  async getLastTargetPosition() {
    let dataFetch = await fetch('/data/settings.json')
    if (dataFetch.status != 404) {
      let json = await dataFetch.json()
      this.targetX = json.targetPos.x
      this.targetY = json.targetPos.y
      this.drawDraggable()
    }
  }

  /**
   * Captures a frame from the webcam and normalizes it between -1 and 1.
   */
  capture() {
    return tf.tidy(() => {
      // Reads the image as a Tensor from the webcam <video> element.
      const webcamImage = tf.browser.fromPixels(this.targetCanvas)

      // Normalize the image between -1 and 1. The image comes in between 0-255,
      // so we divide by 127 and subtract 1.
      return webcamImage.toFloat().div(tf.scalar(127)).sub(tf.scalar(1))
    })
  }

  /**
   * Redraw the webcam feed onto a canvas
   */
  drawOnCanvas(video,c,sx,sy,sWidth,sHeight,dx,dy,dWidth,dHeight,isChangable) {
    if (isChangable) {
      sx = this.targetX
      sy = this.targetY
    }
    if(video.paused || video.ended) return false
    c.drawImage(video,sx,sy,sWidth,sHeight,dx,dy,dWidth,dHeight)
    setTimeout(() => {
      this.drawOnCanvas(video,c,sx,sy,sWidth,sHeight,dx,dy,dWidth,dHeight,isChangable)
    }, 20)
  }

  /**
   * Draw a draggable square on the canvas
   */
  drawDraggable() {
    //clear canvas

    this.uiContext.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height)

    //draw new rectangle
    this.uiContext.strokeStyle = this.targetRecColor
    this.uiContext.lineWidth = this.targetRecStrokeWidth
    this.uiContext.strokeRect(this.targetX,this.targetY,this.targetWH,this.targetWH)
  }


  async setup() {
    return new Promise((resolve, reject) => {
      const navigatorAny = navigator
      navigator.getUserMedia = navigator.getUserMedia || navigatorAny.webkitGetUserMedia || navigatorAny.mozGetUserMedia || navigatorAny.msGetUserMedia
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
            {video: true},
            stream => {
              const constraints = {
                advanced: [
                  {
                    brightness: 100,
                    exposureMode: 'manual',
                    exposureTime: 48.828125, //78.125
                    focusDistance: 20,
                    focusMode: "manual",
                  },
                ]
              }

              const track = stream.getVideoTracks()[0]
              track.applyConstraints(constraints)

              //console.log(track.getCapabilities())

              this.webcamElement.srcObject = stream
              this.webcamElement.addEventListener('loadeddata', async () => {
                let cw = this.webcamElement.videoWidth
                let ch = this.webcamElement.videoHeight
                this.rawVideoCanvas.width = cw
                this.rawVideoCanvas.height = ch
                this.targetCanvas.width = this.targetWH
                this.targetCanvas.height = this.targetWH
                this.uiCanvas.width = cw
                this.uiCanvas.height = ch
                this.webcamElement.addEventListener('play',() => {
                  //redraw full video on canvas
                  this.drawOnCanvas(this.webcamElement,this.rawContext,0,0,cw,ch,0,0,cw,ch, false)
                  //redraw an area of the webcam into a smaller canvas
                  this.drawOnCanvas(this.webcamElement,this.targetContext,0,0,this.targetWH,this.targetWH,0,0,this.targetWH,this.targetWH,true)
                  //draw the draggable square for the target webcam
                  this.drawDraggable()
                },false)
                resolve()
              }, false)
            },
            error => {
              reject()
            })
      } else {
        reject()
      }
    })
  }
}
