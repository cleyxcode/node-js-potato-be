const ort = require('onnxruntime-web');
const sharp = require('sharp');
const path = require('path');

const CLASS_NAMES = ['Early Blight', 'Late Blight', 'Healthy'];
const IMG_SIZE = 300;

// Set WASM paths — navigate up from main entry (dist/ort.node.min.js → dist/ → root)
const ortRoot = path.dirname(path.dirname(require.resolve('onnxruntime-web')));
ort.env.wasm.wasmPaths = path.join(ortRoot, 'dist') + path.sep;
ort.env.wasm.numThreads = 1; // serverless: single-threaded

// Lazy-load session (cached across warm invocations)
let session = null;

async function getSession() {
  if (session) return session;

  // Works locally (process.cwd()/model) and on Vercel (__dirname/../model)
  const modelPath =
    process.env.MODEL_PATH ||
    path.join(__dirname, '..', 'model', 'best_model.onnx');

  console.log('Loading ONNX model from:', modelPath);
  session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });

  console.log('ONNX session loaded. Inputs:', session.inputNames);
  return session;
}

/**
 * Preprocess image buffer → Float32 tensor [1, 300, 300, 3]
 * Matches Python: img.resize(300,300) → float32 → efficientnet.preprocess_input
 * preprocess_input formula: (pixel / 127.5) - 1  →  range [-1, 1]
 */
async function preprocessImage(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(IMG_SIZE, IMG_SIZE)
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const float32 = new Float32Array(IMG_SIZE * IMG_SIZE * 3);
  for (let i = 0; i < data.length; i++) {
    float32[i] = data[i] / 127.5 - 1.0;
  }

  // NHWC: [1, 300, 300, 3] — TF/Keras layout preserved in ONNX export
  return new ort.Tensor('float32', float32, [1, IMG_SIZE, IMG_SIZE, 3]);
}

async function runInference(imageBuffer) {
  const sess = await getSession();
  const inputTensor = await preprocessImage(imageBuffer);

  const inputName = sess.inputNames[0];
  const results = await sess.run({ [inputName]: inputTensor });

  const outputName = sess.outputNames[0];
  const scores = Array.from(results[outputName].data);

  const allPredictions = {};
  CLASS_NAMES.forEach((name, i) => {
    allPredictions[name] = `${(scores[i] * 100).toFixed(2)}%`;
  });

  const maxIdx = scores.indexOf(Math.max(...scores));

  return {
    class: CLASS_NAMES[maxIdx],
    confidence: `${(scores[maxIdx] * 100).toFixed(2)}%`,
    all_predictions: allPredictions,
  };
}

module.exports = { runInference };
