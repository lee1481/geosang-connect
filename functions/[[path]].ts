import app from '../src/worker/index';

export const onRequest = app.fetch;
