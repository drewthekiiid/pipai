/**
 * Simple test workflows
 */

import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './simple-activities';

const { sayHello } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

export async function helloWorkflow(name: string): Promise<string> {
  return await sayHello(name);
} 