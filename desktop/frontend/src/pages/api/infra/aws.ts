// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import * as k8s from '@kubernetes/client-node';
import { ApplyYaml, CRDMeta, GetCRD } from '../../../services/backend/kubernetes';

type Data = {
  name: string
}
const infra_meta: CRDMeta = {
  group: 'infra.sealos.io',
  version: 'v1',
  namespace: 'ns-4862a98a-2488-4183-aa83-23c97a2b24a3',
  plural: 'infras'
};
const infra_name = 'huruizhe-2'

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<Data>
// ) {
//     try{
//       const config = "apiVersion: v1\nclusters:\n- cluster:\n    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUM2VENDQWRHZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQ0FYRFRJeU1EY3lOakUyTkRBd01Wb1lEekl4TWpJd056QXlNVFkwTURBeFdqQVZNUk13RVFZRApWUVFERXdwcmRXSmxjbTVsZEdWek1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBCnM1cUs3b3FmRTdQc2IrREo4SzE4MVcvUVNuamk1ZDFiSWx1SHB0Q3lOTnhtbmJmQnNYdkp3NytiYzJGRmg0MUEKd3ptbVlMR2JVUDl4dm42ZWx6Y3pwTXc4OHhOQXQ2TzlaUnJ5U01kMEtmdlpuaHNrM0Z5dU1jZ3NYd3h5a2dPLwppSzMycDJTT2lPMEt6MUhzZjNpVSttS3d2eS9KSXpTdjcyVXg3VU91b2g3M3AramdZenFiZG9RSnl0NFBvQkw3CmNFWjM5RXRyTko2VzRoeHFUWm5mNkJNanN5bDJXeXgvVUdXK1FXd2pKV2JiS0VQY3pZMExuNkZyb0NKWDFNeXkKemZXSWNHN2JIV1RTQzZQK1cyaGRSU0R3S2FCMzhHZ3F6TlhrRjRtSDdFWi9icEpoazRnaGdnLytkbmxxRW9XTwpuMGN4ZzVrTy9BWWJDeXB6N1JKZWxRSURBUUFCbzBJd1FEQU9CZ05WSFE4QkFmOEVCQU1DQXFRd0R3WURWUjBUCkFRSC9CQVV3QXdFQi96QWRCZ05WSFE0RUZnUVVHaWZUVnl5UFV5V0hIR2RvYVVMRFFQQzRKaGt3RFFZSktvWkkKaHZjTkFRRUxCUUFEZ2dFQkFKSVhzZHc0eEpoWTViY3VPWGxxSWpYcCtMS1lxdk45VUpmLzhNL24rbG9VWVZqZAowQzVoN0x0SDI0WkxzcUZKMnNlcDllSWhaMFVUSGFKejA0YnFZRjF6eTNUWWYzZE4zWXh3cDVRVlRRanViNktYCkNxcHA4VldsL3pMbnh2VEp0MkhuQ2ZXTUF0VmQ3ckVjMHFHc09hWFB3bXBZc2IweGJzcWdseWxLYm1MdHE5WVoKamRxSkJ6cXJHbloxcGJiNU9sVmREOUc4L2g5elZVRFlhNXYxYnRFTncrand4NUkza1JQN21ZeEVuOENINElJaAoybVo0elZyV0h0Qm9tbzBaVVdRYjVtLzBvMTRkeStVdGRydThHNHNFbS92emVIampPRGFsRk9wZy9OeWZHV2E1ClN4ZkxrenhvYUhQS0FPTW1HSmMvcHBGRXgzdG5WdjBPT0xOU2NXUT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=\n    server: https://apiserver.cluster.local:6443\n  name: sealos\ncontexts:\n- context:\n    cluster: sealos\n    user: 4862a98a-2488-4183-aa83-23c97a2b24a3\n  name: 4862a98a-2488-4183-aa83-23c97a2b24a3@sealos\ncurrent-context: 4862a98a-2488-4183-aa83-23c97a2b24a3@sealos\nkind: Config\npreferences: {}\nusers:\n- name: 4862a98a-2488-4183-aa83-23c97a2b24a3\n  user:\n    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURKekNDQWcrZ0F3SUJBZ0lSQU95b2FPUnhRcHlyZ1AwdUh6RlU1aTh3RFFZSktvWklodmNOQVFFTEJRQXcKRlRFVE1CRUdBMVVFQXhNS2EzVmlaWEp1WlhSbGN6QWdGdzB5TWpBNU1qZ3dPRFF4TURoYUdBOHlNRFUwTURZdwpOakV3TWpjME9Gb3dMekV0TUNzR0ExVUVBeE1rTkRnMk1tRTVPR0V0TWpRNE9DMDBNVGd6TFdGaE9ETXRNak5qCk9UZGhNbUl5TkdFek1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBcGZubWdiN3kKZW1NemRodGFuQkF4cGl1NEJhOVhrQjFsMS9ZQ2ltSjNORTAxUkpoSnBVd3l6TTRNY0Fpc294Wk5kcEFTTEFnWgpFcjB3VmZnSWorS3pUak1mWVh0aytkS2tVSXpyb081VG5YL0cyOWZyN3IvRlNFZlNPTW1NSWp1ZmlzdDFhU0g3ClJmcmVMNkRQVDBvOXR6SnF3ZFdwTjBoOThYSXJEbVc1ZkJlMnE2MjJzdDcrejR0cUljS1FHYWlxUDBERnJZeFMKY0tPanhsQjlINlk0RUtFTXN4OEc0NWdpMHdTSG1JcmREN2tNTGJPbnp6cUtLenBFZnBrQnBBRm1FVEs5Nk9YVgpqZ29TTy9WUmJVMTN5eEtVMzRWVHRWaHlTZnZRRm0vbFVsMG4xdWZBYUxwWUQrSUhZVHlING5XcktMUnllTU1YCkFiTTBNZUlTZXBSb3pRSURBUUFCbzFZd1ZEQU9CZ05WSFE4QkFmOEVCQU1DQmFBd0V3WURWUjBsQkF3d0NnWUkKS3dZQkJRVUhBd0l3REFZRFZSMFRBUUgvQkFJd0FEQWZCZ05WSFNNRUdEQVdnQlFhSjlOWExJOVRKWWNjWjJocApRc05BOExnbUdUQU5CZ2txaGtpRzl3MEJBUXNGQUFPQ0FRRUFSak91dWJicEN1S1UydXcxQlFackw4OW8yTnBICnovbEV5VnZ2UC9rblBzeDFwZWl5YndMMm5HcUs4cDF1SDN3MWx2M215ZFNneVlwVEFNZHBYZWhUc1gxWUllRWoKNWtGdmlNWlVCV3VKaHVGbjJEN0dJVk5Mek53aktCUXZGRUhtbWtMcDVuL3ZBSEdBcHh0NU5odFEyMHpPN1ZUbgo2QVVVUWFWbFBWK0RpWURBZEtvcUx6RVdCMUZYaC8xV1hTMlFMaHFxZVFXajdQaDI0cjB0dlRCTjEzNndkdm5FCkxqUFh4TTl6ZCtjeUhaemQzcUQ5Y2hVSWx4dUhjaHF6SzI5OG5LemdRNEF5SEpmOEk4Ky9hSWlQVGljOHdIRlQKR1M3SUtrVXpVSmc2TFU3K0toUmhjMXJ5S2ZvOGVBelM3aTl6cWZmRG44b2dJN09uejU2cnNwaDZMQT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K\n    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBcGZubWdiN3llbU16ZGh0YW5CQXhwaXU0QmE5WGtCMWwxL1lDaW1KM05FMDFSSmhKCnBVd3l6TTRNY0Fpc294Wk5kcEFTTEFnWkVyMHdWZmdJaitLelRqTWZZWHRrK2RLa1VJenJvTzVUblgvRzI5ZnIKN3IvRlNFZlNPTW1NSWp1ZmlzdDFhU0g3UmZyZUw2RFBUMG85dHpKcXdkV3BOMGg5OFhJckRtVzVmQmUycTYyMgpzdDcrejR0cUljS1FHYWlxUDBERnJZeFNjS09qeGxCOUg2WTRFS0VNc3g4RzQ1Z2kwd1NIbUlyZEQ3a01MYk9uCnp6cUtLenBFZnBrQnBBRm1FVEs5Nk9YVmpnb1NPL1ZSYlUxM3l4S1UzNFZUdFZoeVNmdlFGbS9sVWwwbjF1ZkEKYUxwWUQrSUhZVHlING5XcktMUnllTU1YQWJNME1lSVNlcFJvelFJREFRQUJBb0lCQUNsWUQ3QkFKVnlSTzI5dgpMdW56S3JydTV2OGJoMTlSdzEzQlhTNmxpbllQeVhZVnpUcU11WmJFdU5wcmZyMTlQN3lKOU16ZEU0blVjS2JwCml4QjBjeC9Hb2ttQkdFMFd5SEY4T1BHMGpFV09YN1hCbW5hMWRHb2w0ZHJkY2JmUlRGT2hqTlNzYjFBbVJwUnMKcFZkbDhldWhkbkJrVGF1RXRrS2ZvdFFLU09MOUNvUnpVK0k3MExycGg1a1JIeGc4VmE5RG1EaFVOOEhpeUpOMAovUlliME1BYVJsQzQ0SWMvMUlLZmJDZjVNaFA1b0czbFNaYnBvd29vUTBRMGR3d3N0aE9Ca3R4dG9OdHdQaytxCnBzNHZ3dzRIM25KeWo1eWJETXBKVmpmamlaOTduS0VFNlp1d3IvdStlcUV4QW5RRzZzd3M2WUJWNlZJTWp6SVYKWkNnME9xMENnWUVBekwzVGVuc0pqbkpoanFQWWpUZy80SG00M0N1TXlFYTBra2dyejY1K2xIQ0drTExkSm1YNAo5N2N4bS9ZU1lJSmZ0TnVlT1lSNkFybEYyMGs0b1EvWGFQa2dIQk5qaUdEanBtNXNySG1xVFpnWXl3K2RJcjZ4CkhQOFgveGtqSFRhSFhjY2FEYXU1Qk9kSFp4RUJDTkV1bVptMmlxYXl6WXpYWEtKei9EOUk3R3NDZ1lFQXo0ZU0KaTBKMGJ4VVNXOG5ORjVNTzF5dDh5VkNnUmY2dEJzTktLZE51b2FLWXJxcjZmYTRHV3pKWDh5ZlNBdUIvTEpTWAo0SnRWNlZrSU9jZklhM3VvWEpjOVE2cXczdmRJWEJkbzVjd1FhZktTdU9NSnk3U2oxSHJMZUliWWp1c0gyOFdiCklaek9kWkthZnJLUGxnSkh3dVliWUVnZmVOU3dxc2VUZjhJeVRhY0NnWUE1M3IzVHRNc3l0Q25YQTRER0Njd2sKU3NOeGwrMm0valV6MDZwdWZVZlI5U3hUNGZxWVMrSmZRaXlIaExvVkJVUy8vZ052Qm43bUhqQWNsMG1tWEsvcQpQK0JQanp0bTVOdnp3dXA4cGJiNVQ3QlNWUXQ1TXFVbEtRVkRXWHVQV2taUXYySWgweFBzeXVKbncycWpiMXpZCmxaWC9BcmN2V2t2Vkp5WFplcG5HR1FLQmdRREM4Z2J4RGtVSDBCaUZ4c1IwMzd5eUhYVEVPNHZERktCKzJOYUQKQWMxTDRzeGdUOWFzVnR3N3NNZnpieldWWkVPeW9nY2xnMldwcE92WU16YXUyT05uenQ1TEFUM1N4U0hnK0ZDZQpoUm5xSEdiOWJMRFgvV0ZraU5FMzhCdmY3U0pkclh1emtIUlU5NWxQYVBiK3FEZTIrcWMrdzZGa3hROEw3aHc5CmlEUHV3d0tCZ1FDdzlNSUFGYzZ3TVJxaEE3TlZMamVPMFJiRDFZWHU5VUVScHQxcHZ3dllwb3hoYkMzNFRUdjgKTVFpYWhHRVdtMkxtNVAra0dCaXVKT3N1dWQ2V0JBU2RGaG5EVktRc1pBdEtySjRCUzFGUG90UlRpT0t4N1pjbwp4eHdEZ0pwcnBkQzFCWFpKSVhXUnZseVZxOExHVmZRZWJ0SEk0dkVPc3VYWGkzOTJ2SWFoL3c9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=\n"
//       const kc = new k8s.KubeConfig();
//       kc.loadFromString(config)
//       console.log(kc)
//       const infraDesc = await GetCRD(kc, infra_meta,infra_name)
//       console.log(infraDesc.body)
//       console.log(infraDesc.body.spec)
//       console.log(infraDesc.body.status)
//     }catch(err){
//       if (err instanceof k8s.HttpError) {
//           console.log(err.body.message)
//         }
//     }
    
//     console.log(req.body.masterType)
//     console.log(req.body.masterCount);
//     console.log(req.body.nodeType);
//     console.log(req.body.nodeCount);
//     console.log(req.body.image1);
//     console.log(req.body.image2);
    
//     res.status(200).json({ name: 'John Doe' })

//   }

  export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>,
  ) {
      try{
        const config = req.body.kubeconfig
        const kc = new k8s.KubeConfig();
        kc.loadFromString(config)
        console.log(kc)
        const infraDesc = await GetCRD(kc, infra_meta,infra_name)
        console.log(infraDesc.body)
        console.log(infraDesc.body.spec)
        console.log(infraDesc.body.status)
      }catch(err){
        if (err instanceof k8s.HttpError) {
            console.log(err.body.message)
          }
      }
      
      console.log(req.body.masterType)
      console.log(req.body.masterCount);
      console.log(req.body.nodeType);
      console.log(req.body.nodeCount);
      console.log(req.body.image1);
      console.log(req.body.image2);
      
      res.status(200).json({ name: 'John Doe' })
  
    }
  