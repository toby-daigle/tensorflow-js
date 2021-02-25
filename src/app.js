import * as tf from '@tensorflow/tfjs';
import * as vis from '@tensorflow/tfjs-vis';
window.tf = tf;

function plot(pointsArray, featureName) {
    vis.render.scatterplot(
        { name: `${featureName} vs House Price` },
        { values: [pointsArray], series: ['original'] },
        { xLabel: featureName, yLabel: 'Price' }
    );
}

function normalize(tensor) {
    const min = tensor.min();
    const max = tensor.max();
    return {
        tensor: tensor.sub(min).div(max.sub(min)),
        min,
        max
    };
}

function denormalize(tensor, min, max) {
    return tensor.mul(max.sub(min)).add(min);
}
let model
function createModel() {
    model = tf.sequential();

    model.add(tf.layers.dense({ units: 1, useBias: true, activation: 'linear', inputDim: 1 }));

    const optimizer = tf.train.sgd(0.1);
    model.compile({ loss: 'meanSquaredError', optimizer })

    return model;
}

async function trainModel(model, trainingFeatureTensor, trainingLabelTensor) {
    const { onEpochEnd } = vis.show.fitCallbacks({ name: 'Training performance' }, ['loss']);
    const onEpochBegin = () => vis.show.layer({ name: `Layer 1` }, model.getLayer(undefined, 0));
    return model.fit(trainingFeatureTensor, trainingLabelTensor, { batchSize: 32, epochs: 20, validationSplit: 0.2, callbacks: { onEpochEnd, onEpochBegin } });
}

let normalizedFeature, normalizedLabel;
let trainingFeatureTensor, testingFeatureTensor, trainingLabelTensor, testingLabelTensor;

async function run() {
    // Import from CSV
    const houseSalesDataSet = tf.data.csv('./public/kc_house_data.csv');

    // Extract x and y value to plot
    const pointsDataset = houseSalesDataSet.map(record => ({ x: record.sqft_living, y: record.price }));
    const points = await pointsDataset.toArray();
    if (points.length % 2 !== 0) {
        points.pop();
    }
    // Shuffle data
    tf.util.shuffle(points);

    plot(points, 'Square feet');

    // Extract Features (inputs)
    const featureValues = points.map(p => p.x);
    const featureTensor = tf.tensor2d(featureValues, [featureValues.length, 1]);

    // Extract Labels (outputs)
    const labelValues = points.map(p => p.y);
    const labelTensor = tf.tensor2d(labelValues, [labelValues.length, 1]);

    // Normalise features and labels
    normalizedFeature = normalize(featureTensor);
    normalizedLabel = normalize(labelTensor);
    featureTensor.dispose();
    labelTensor.dispose();

    [ trainingFeatureTensor, testingFeatureTensor ] = tf.split(normalizedFeature.tensor, 2);
    [ trainingLabelTensor, testingLabelTensor ] = tf.split(normalizedLabel.tensor, 2);

    document.getElementById('model-status').innerHTML = 'No model trained';
    document.getElementById('train-button').removeAttribute('disabled');
}

run();

function toggleVisor() {
    vis.visor().toggle();
}

async function train() {
    ['train', 'test', 'load', 'predict', 'save'].forEach(id => document.getElementById(`${id}-button`).setAttribute('disabled', 'disabled'));
    document.getElementById('model-status').innerHTML = 'Training ...';
    const model = createModel();
    vis.show.modelSummary({ name: 'Model summary' }, model);

    const layer = model.getLayer(undefined, 0);
    vis.show.layer({ name: 'Layer 1' }, layer);

    const result = await trainModel(model, trainingFeatureTensor, trainingLabelTensor);

    const trainingLoss = result.history.loss.pop();
    console.log(`Training set loss: ${trainingLoss}`);
    const validationLoss = result.history.val_loss.pop();
    console.log(`Validation set loss: ${validationLoss}`);

    document.getElementById('model-status').innerHTML = `Trained (unsaved)\nLoss: ${trainingLoss.toPrecision(5)}\nValidation: ${validationLoss.toPrecision(5)}`;
    document.getElementById('test-button').removeAttribute('disabled');
}

async function test() {
    const lossTensor = model.evaluate(testingFeatureTensor, testingLabelTensor);
    const testingLoss = await lossTensor.dataSync();
    console.log(`Testing set loss: ${testingLoss}`);

    document.getElementById('testing-status').innerHTML = `Testing set loss: ${Number(testingLoss).toPrecision(5)}`
}

function load() {

}

function save() {

}

function predict() {

}

toggleVisor();
document.getElementById('toggle-button').onclick = toggleVisor;
document.getElementById('train-button').onclick = train;
document.getElementById('test-button').onclick = test;
document.getElementById('load-button').onclick = load;
document.getElementById('save-button').onclick = save;
document.getElementById('predict-button').onclick = predict;
