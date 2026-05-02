import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DemoAccountService } from '../demo-account/demo-account.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const demoAccount = app.get(DemoAccountService);
    const result = await demoAccount.importInstrumentMarketData();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
