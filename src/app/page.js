"use client";
import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import * as dfd from "danfojs";
import dynamic from 'next/dynamic';
import Link from 'next/link';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const ModelComponent = () => {
  const [model, setModel] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [datesToPredict, setDatesToPredict] = useState([]);
  const [realTemps, setRealTemps] = useState([]);
  const [realDates, setRealDates] = useState([]);
  const [scalerFeatures, setScalerFeatures] = useState(null);
  const [scalerTemp, setScalerTemp] = useState(null);
  const [endDate, setEndDate] = useState('1992-12-31');
  const [predictionDate, setPredictionDate] = useState('1998-01-01');
  const [isLoading, setIsLoading] = useState(true);
  const [isEndDateLoading, setIsEndDateLoading] = useState(false);

  useEffect(() => {
    async function loadModel() {
      setIsLoading(true);
      const modelUrl = `${window.location.origin}/model/model.json`;
      const loadedModel = await tf.loadLayersModel(modelUrl);
      setModel(loadedModel);
      console.log('Modelo cargado');
      setIsLoading(false);
    }
    loadModel();
  }, []);

  const fetchData = async () => {
    setIsEndDateLoading(true);
    const url = 'https://raw.githubusercontent.com/jbrownlee/Datasets/master/daily-min-temperatures.csv';
    const df = await dfd.readCSV(url);

    const scalerFeatures = new dfd.MinMaxScaler();
    const scalerTemp = new dfd.MinMaxScaler();

    const day = df['Date'].map(date => new Date(date).getDate());
    const month = df['Date'].map(date => new Date(date).getMonth() + 1);
    const year = df['Date'].map(date => new Date(date).getFullYear());
    const temp = df['Temp'];

    const features = await dfd.concat({ dfList: [day, month, year], axis: 1 });
    const normalizedFeatures = scalerFeatures.fitTransform(features);
    const normalizedTemp = scalerTemp.fitTransform(temp);

    setScalerFeatures(scalerFeatures);
    setScalerTemp(scalerTemp);

    const realDates = df['Date'].values;
    const realTemps = temp.values;
    setRealDates(realDates);
    setRealTemps(realTemps);

    const startDate = new Date('1991-01-01');
    const endDateObj = new Date(endDate);
    const datesToPredict = [];
    for (let date = startDate; date <= endDateObj; date.setDate(date.getDate() + 1)) {
      datesToPredict.push(date.toISOString().split('T')[0]);
    }
    setDatesToPredict(datesToPredict);

    if (model) {
      const predictions = [];
      for (let dateStr of datesToPredict) {
        const dateObj = new Date(dateStr);
        const day = dateObj.getDate();
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();
        const inputTensor = tf.tensor2d([[day, month, year]]);
        const scaledInput = scalerFeatures.transform(inputTensor);
        const predictionTensor = model.predict(scaledInput);
        const prediction = scalerTemp.inverseTransform(predictionTensor).dataSync()[0];
        predictions.push(prediction);
      }
      setPredictions(predictions);
    }
    setIsEndDateLoading(false);
  };

  useEffect(() => {
    if (model) {
      fetchData();
    }
  }, [model, endDate]);

  const predictTemperature = async (dateStr) => {
    if (!model || !scalerFeatures || !scalerTemp) {
      console.error('Modelo o escaladores no cargados');
      return null;
    }

    const dateObj = new Date(dateStr);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const inputTensor = tf.tensor2d([[day, month, year]]);
    const scaledInput = scalerFeatures.transform(inputTensor);
    const predictionTensor = model.predict(scaledInput);
    const prediction = scalerTemp.inverseTransform(predictionTensor).dataSync()[0];

    return prediction;
  };

  if (isLoading) {
    return <div className="div-flex"><h1>Loading model...</h1><div className="loader">
    <div className="bar1"></div>
    <div className="bar2"></div>
    <div className="bar3"></div>
    <div className="bar4"></div>
    <div className="bar5"></div>
    <div className="bar6"></div>
    <div className="bar7"></div>
    <div className="bar8"></div>
    <div className="bar9"></div>
    <div className="bar10"></div>
    <div className="bar11"></div>
    <div className="bar12"></div>
</div></div>;
  }

  const plotLayout = {
    title: 'Predictions and Real Data',
    xaxis: { title: 'Date' },
    yaxis: { title: 'Temperature' },
    paper_bgcolor: '#333', // Color de fondo del papel (área fuera del gráfico)
    plot_bgcolor: '#333',  // Color de fondo del área de trazado
    font: { color: 'white' }, // Color de fuente general
  };

  return (
    <div>
      <h1>Minimum Temperature Predictions since 1991 in Melbourne</h1>
      <div>
        <label htmlFor="end-date">End date:</label>
        <input
          type="date"
          id="end-date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setIsEndDateLoading(true);
          }}
        />
        {isEndDateLoading && <span> <div className="loader">
    <div className="bar1"></div>
    <div className="bar2"></div>
    <div className="bar3"></div>
    <div className="bar4"></div>
    <div className="bar5"></div>
    <div className="bar6"></div>
    <div className="bar7"></div>
    <div className="bar8"></div>
    <div className="bar9"></div>
    <div className="bar10"></div>
    <div className="bar11"></div>
    <div className="bar12"></div>
</div>Loading new data...</span>}
      </div>
      {isEndDateLoading ? (
        <div>Loading predictions...</div>
      ) : (
        <Plot
          data={[
            {
              x: datesToPredict,
              y: predictions,
              type: 'scatter',
              mode: 'lines',
              name: 'Predictions',
              line: { color: 'red' },
            },
            {
              x: realDates,
              y: realTemps,
              type: 'scatter',
              mode: 'lines',
              name: 'Real Data',
              line: { color: 'green' },
            },
          ]}
          layout={plotLayout}
          useResizeHandler={true}
          style={{ width: "100%", height: "500px" }}
          config={{ responsive: true, displayModeBar: true, }}
        />
      )}
      <div>
        <h2>Prediction for specific date</h2>
        <input
          type="date"
          value={predictionDate}
          onChange={(e) => setPredictionDate(e.target.value)}
        />
        <button onClick={async () => {
          setIsLoading(true);
          const temp = await predictTemperature(predictionDate);
          setIsLoading(false);
          if (temp !== null) {
            alert(`Predicted temperature for ${predictionDate}: ${temp.toFixed(2)}`);
          } else {
            alert('The prediction could not be made. Make sure the model is loaded.');
          }
        }}>
          Predict temperature
        </button>
      </div>

      <div className="project-github">
        <p>This project is in</p>
        <Link href="https://github.com/diegoperea20/Minimum-Temperature-Melbourne">
          <img width="96" height="96" src="https://img.icons8.com/fluency/96/github.png" alt="github"/>
        </Link>
      </div>
    </div>
  );
};

export default ModelComponent;