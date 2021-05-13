class Model{
  constructor(webcam, dataPointsPerClass, captureSpeed){
    this.webcam = webcam
    this.classes = ['0', '1', '2']
    this.dataPointsPerClass = dataPointsPerClass
    this.currentClassIndex = 0
    this.isTrained = false
    this.captureInterval
    this.captureSpeed = captureSpeed
    this.epochs = 200
    this.learningRate = 0.00001
    this.model
    this.prediction
    this.confidenceLevel

    this.isPredicting = true
  }

  /**
   * Try to load an existing model
   */
  async load(){
    return new Promise(async (resolve, reject) => {
      try {
        this.model = await tf.loadLayersModel('/models/model.json')
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * Save the target position into a JSON setting file
   */
  saveTargetPosition(webcam){
    console.log(`tagetX ${webcam.targetX}, targetY ${webcam.targetY}`)

    fetch('/save_webcam_target_position', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetPos: {
          x: webcam.targetX,
          y: webcam.targetY
        }
      })
    }).then(function(response) {
      console.log('json data cleared')
    })
  }

  /**
   * Capturing a frame from the webcam target
   */
  capture(classIndex){
    return new Promise((resolve, reject) => {
      //capture data points
      let captureCount = 0
      this.currentClassIndex = classIndex

      this.captureInterval = setInterval(async () => {
        let arr = this.webcam.capture().arraySync()
        let flat = tf.util.flatten(arr)
        flat.push(Number(this.currentClassIndex))

        //save the data to disk
        await this.saveDataToJson(flat)
        console.log(`capture count:`, captureCount)

        //update dom
        $('.samples-number').html(captureCount + 1)

        if (++captureCount >= this.dataPointsPerClass) {
          clearInterval(this.captureInterval)
          console.log(`capture done !`)
          resolve()
        }
      }, this.captureSpeed)
    })
  }

  /**
   * Clearing the previously saved dataset
   */
  clearData(){
    fetch('/clear_dataset', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(function(response) {
      console.log('json data cleared')
    })
  }

  /**
   * Saving webcam frames in a JSON file
   */
  saveDataToJson(data){
    return new Promise(function(resolve, reject) {
      fetch('/save_sample_data', {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataPoint: data
        })
      }).then(function(response) {
        resolve()
      })
    })
  }

  /**
   * Creating the model and training
   */
  async train(){
    //train the model
    let dataFetch = await fetch('/data/data.json')
    let json = await dataFetch.text()
    json = json.replace(/^\[/, '[[')
    json = json.replace(/\]$/, ']]')
    json = JSON.parse(json)

    const [xTrain, yTrain, xTest, yTest] = getData(json, this.classes, 0.20)

    const params = {
      learningRate: this.learningRate,
      epochs: this.epochs
    }

    // Define the topology of the model: two dense layers.
    const model = tf.sequential()
    model.add(tf.layers.dense({
      units: 30,
      activation: 'tanh',
      inputShape: [xTrain.shape[1]]
    }))
    model.add(tf.layers.dense({
      units: this.classes.length,
      activation: 'softmax'
    }))

    model.summary()

    const optimizer = tf.train.adam(params.learningRate)
    model.compile({
      optimizer: optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    })

    const beginMs = performance.now()
    // Call `model.fit` to train the model.
    const history = await model.fit(xTrain, yTrain, {
      epochs: params.epochs,
      validationData: [xTest, yTest],
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const secPerEpoch = (performance.now() - beginMs) / (1000 * (epoch + 1))
          console.log(`Training model... Approximately ${secPerEpoch.toFixed(4)} seconds per epoch`)
          console.log('epoch: ', epoch, 'loss: ', logs.loss)

          $('.training-info .progress').html(epoch * 100 / this.epochs)
          $('.loss-info').html(logs.loss)
        },
      }
    })
    const secPerEpoch = (performance.now() - beginMs) / (1000 * params.epochs)
    console.log(`Model training complete:  ${secPerEpoch.toFixed(4)} seconds per epoch`)

    this.model = model
  }

  /**
   * Predict
   */
  async predict(){
    while (this.isPredicting) {
      const predictedClass = await tf.tidy(() => {
        let arr = this.webcam.capture().arraySync()
        let flat = tf.util.flatten(arr)

        const inputData = flat
        const input = tf.tensor2d([inputData], [1, inputData.length])
        const predictOut = this.model.predict(input)
        const logits = Array.from(predictOut.dataSync())
        const confidenceLevel = logits[predictOut.argMax(-1).dataSync()[0]]
        const winner = this.classes[predictOut.argMax(-1).dataSync()[0]]

        this.confidenceLevel = confidenceLevel
        this.prediction = winner

        //update UI
        $('.confidence .level').html((confidenceLevel * 100).toFixed(2))
        $('.prediction').html(Number(winner) + 1)

        return predictOut
      })

      predictedClass.dispose()

      await tf.nextFrame()
    }
  }

  /**
   * Saving the model onto the disk
   */
  async save(){
    //save the model
    await this.model.save('http://localhost:3000/save_model_to_disk')
  }
}
