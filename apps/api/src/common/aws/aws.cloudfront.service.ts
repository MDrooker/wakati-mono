// import { Injectable } from "@nestjs/common";
// import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
// @Injectable()
// export class AWSCloudFrontService {
//     constructor() { }
//     async createInvalidation({ distributionId, paths }: { distributionId: string, paths: string[] }) {
//         let cloudfront = new CloudFrontClient();
//         let params = {
//             DistributionId: distributionId,
//             InvalidationBatch: {
//                 CallerReference: crypto.randomUUID(),
//                 Paths: {
//                     Quantity: paths.length,
//                     Items: paths
//                 }
//             }
//         };
//         const createInvalidationCommand = new CreateInvalidationCommand(params)
//         const response = await cloudfront.send(createInvalidationCommand)

//         return response
//     }
// }
