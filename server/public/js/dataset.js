/**
 * Convert data arrays to `tf.Tensor`s.
 *
 * @param data An `Array` of `Array`s, each element
 * @param targets An `Array` of numbers, with values from the set
 * @param testSplit Fraction of the data at the end to split as test data: a
 *   number between 0 and 1.
 * @return A length-4 `Array`, with
 *   - training data as `tf.Tensor` of shape [numTrainExapmles, 4].
 *   - training one-hot labels as a `tf.Tensor` of shape [numTrainExamples, 3]
 *   - test data as `tf.Tensor` of shape [numTestExamples, 4].
 *   - test one-hot labels as a `tf.Tensor` of shape [numTestExamples, 3]
 */
function convertToTensors(data, classes, targets, testSplit) {
  const numExamples = data.length
  if (numExamples !== targets.length) {
    throw new Error('data and split have different numbers of examples')
  }

  // Randomly shuffle `data` and `targets`.
  const indices = [];
  for (let i = 0; i < numExamples; ++i) {
    indices.push(i)
  }
  tf.util.shuffle(indices)

  const shuffledData = []
  const shuffledTargets = []
  for (let i = 0; i < numExamples; ++i) {
    shuffledData.push(data[indices[i]])
    shuffledTargets.push(targets[indices[i]])
  }

  // Split the data into a training set and a tet set, based on `testSplit`.
  const numTestExamples = Math.round(numExamples * testSplit)
  const numTrainExamples = numExamples - numTestExamples

  const xDims = shuffledData[0].length

  // Create a 2D `tf.Tensor` to hold the feature data.
  const xs = tf.tensor2d(shuffledData, [numExamples, xDims])

  // Create a 1D `tf.Tensor` to hold the labels, and convert the number label
  // from the set {0, 1, 2} into one-hot encoding (.e.g., 0 --> [1, 0, 0]).
  const ys = tf.oneHot(tf.tensor1d(shuffledTargets).toInt(), classes.length)

  // Split the data into training and test sets, using `slice`.
  const xTrain = xs.slice([0, 0], [numTrainExamples, xDims])
  const xTest = xs.slice([numTrainExamples, 0], [numTestExamples, xDims])
  const yTrain = ys.slice([0, 0], [numTrainExamples, classes.length])
  const yTest = ys.slice([0, 0], [numTestExamples, classes.length])
  return [xTrain, yTrain, xTest, yTest]
}

/**
 * Obtains data, split into training and test sets.
 *
 * @param testSplit Fraction of the data at the end to split as test data: a
 *   number between 0 and 1.
 *
 * @param return A length-4 `Array`, with
 *   - training data as an `Array` of length-4 `Array` of numbers.
 *   - training labels as an `Array` of numbers, with the same length as the
 *     return training data above. Each element of the `Array` is from the set
 *     {0, 1, 2}.
 *   - test data as an `Array` of length-4 `Array` of numbers.
 *   - test labels as an `Array` of numbers, with the same length as the
 *     return test data above. Each element of the `Array` is from the set
 *     {0, 1, 2}.
 */
function getData(dataset, classes, testSplit) {
  return tf.tidy(() => {
    const dataByClass = []
    const targetsByClass = []
    for (let i = 0; i < classes.length; ++i) {
      dataByClass.push([])
      targetsByClass.push([])
    }
    for (const example of dataset) {
      const target = example[example.length - 1]
      const data = example.slice(0, example.length - 1)
      dataByClass[target].push(data)
      targetsByClass[target].push(target)
    }

    const xTrains = []
    const yTrains = []
    const xTests = []
    const yTests = []
    for (let i = 0; i < classes.length; ++i) {
      const [xTrain, yTrain, xTest, yTest] = convertToTensors(dataByClass[i], classes, targetsByClass[i], testSplit)
      xTrains.push(xTrain)
      yTrains.push(yTrain)
      xTests.push(xTest)
      yTests.push(yTest)
    }

    const concatAxis = 0;
    return [
      tf.concat(xTrains, concatAxis), tf.concat(yTrains, concatAxis),
      tf.concat(xTests, concatAxis), tf.concat(yTests, concatAxis)
    ]
  })
}
