```json
{
  "log": "I0530 04:01:42.975209 1 secretproviderclasspodstatus_controller.go:366] \"reconcile complete\" spc=\"default/aws-secrets\" pod=\"default/underwriter-deployment-6dd7b777b7-qppqz\" spcps=\"default/underwriter-deployment-6dd7b777b7-qppqz-default-aws-secrets\"\n",
  "stream": "stderr",
  "kubernetes": {
    "pod_name": "csi-secrets-store-secrets-store-csi-driver-pl8w7",
    "namespace_name": "kube-system",
    "pod_id": "b308b13c-b4d7-423d-acba-0c637c391d8f",
    "host": "ip-10-0-102-14.ec2.internal",
    "container_name": "secrets-store",
    "docker_id": "45b375ea7d97ede18d26b38eeda467ea4f694a05fa1bb59f17093cc83febed0f",
    "container_hash": "k8s.gcr.io/csi-secrets-store/driver@sha256:4df23dc3720360ec88136abddb3ab62eb2a7ed758722bc045485ab6d0bd43748",
    "container_image": "k8s.gcr.io/csi-secrets-store/driver:v1.1.2"
  }
}
```

```json
POST /test-index_01/_doc
{
  "@timestamp": "2019-05-18T15:57:27.541Z",
  "message": "Hello world",
  "mappings": {
    "_meta": {
      "beat": "functionbeat",
      "version": "8.2.0"
    },
    "_data_stream_timestamp": {
      "enabled": true
    },
    "dynamic_templates": [
      {
        "kubernetes.labels.*": {
          "path_match": "kubernetes.labels.*",
          "mapping": {
            "type": "keyword"
          }
        }
      },
      {
      "kubernetes.selectors.*": {
        "path_match": "kubernetes.selectors.*",
        "mapping": {
          "type": "keyword"
        }
      }
    }]
  }
}
```
