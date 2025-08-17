import { Module, Logger } from '@nestjs/common';
// Use require to import cluster for compatibility with Node.js types
const cluster = require('cluster');
const os = require('os');

// This file has been moved to ../common/cluster.module.ts

@Module({})
export class ClusterModule {
  static clusterize(callback: () => void, enableCluster = false) {
    if (enableCluster && cluster.isMaster) {
      const cpuCount = os.cpus().length;
      Logger.log(`Primary process ${process.pid} is running in cluster mode`);
      for (let i = 0; i < cpuCount; i++) {
        cluster.fork();
      }
      cluster.on('exit', (worker, code, signal) => {
        Logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
      });
    } else {
      callback();
    }
  }
}
