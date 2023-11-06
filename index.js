const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');
const { chatGPT } = require('./utils');
const googleTTS = require('google-tts-api');

//Conf .env
require('dotenv').config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

//Configuracion BotTelegram:
app.use(bot.webhookCallback('/telegram-bot'));
bot.telegram.setWebhook(`${process.env.BOT_URL}/telegram-bot`);

app.post('/telegram-bot', (req, res) => {
  res.send('Hola Bot');
});


//Comandos
// ctx -> contexto
bot.command('test', async (ctx) => {
  ctx.replyWithDice();

});

async function getWeather(ciudad) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${ciudad}&appid=${process.env.API_KEY}&units=metric`);
    const data = await response.json();
    const {
      main: { temp, temp_min, temp_max, humidity },
      coord: { lon, lat }
    } = data;
    const tiempo = {
      temp,
      temp_min,
      temp_max,
      humidity,
      lon,
      lat
    }
    return tiempo;

  } catch (err) {
    console.log('FAIL:', err);
    return { fail: err.message }
  }
}
bot.command('tiempo', async (ctx) => {

  const ciudad = ctx.message.text.slice(8);
  const tiempo = await getWeather(ciudad);
  ctx.reply(`El tiempo en: ${ciudad}`);
  ctx.reply(`Temperatura: ${tiempo.temp}`);
  ctx.reply(`Temperatura máxima ${tiempo.temp_min}`);
  ctx.reply(`Temperatura mínima: ${tiempo.temp_max}`);
  ctx.reply(`Humedad: ${tiempo.humidity}`);
  ctx.reply(`Longitud: ${tiempo.lon}`);
  ctx.reply(`Latidtud: ${tiempo.lat}`);
  ctx.replyWithLocation(tiempo.lat, tiempo.lon);
});

bot.command('receta', async (ctx) => {
  try {
    const ingredientes = ctx.message.text.substring(7).trim();
    const titulo = await chatGPT(`Dame el titulo de una receta que pueda concinar con los siguientes ingredientes: ${ingredientes}`);
    const elaboracion = await chatGPT(`Dame los pasos a seguir de la receta: ${titulo}`);

    //Transformar el titulo a audio.
    const audioURL = googleTTS.getAudioUrl(titulo, {
      lang: 'es',
      slow: false,
      host: 'https://translate.google.es'
    });
    //Para respetar el orden de ejecucion en promesas async, hacerlas esperar a todas await
    await ctx.reply(titulo);
    await ctx.reply(elaboracion);
    await ctx.reply(audioURL);

  } catch (err) {
    ctx.reply(err.message);
  }
});

bot.on('message', async (ctx) => {
  //console.log(ctx.message.text);

  const configuration = new Configuration(
    {
      apiKey: process.env.OPENAI_KEY
    });
  // headers.Authorization, 'Content-Length'
  const openai = new OpenAIApi(configuration);

  const completion = await openai.createChatCompletion({
    model: 'gpt-4',
    max_tokens: 200,
    messages: [
      {
        role: 'assistant',
        content: `Eres un bot de telegram muy eficiente`
      },
      {
        role: 'user',
        content: `Respondeme en menos de 200 caracteres a la pregunta: ${ctx.message.text}`
      }]
  });
  ctx.reply(completion.data.choices[0].message.content);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});



