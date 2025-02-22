docker build -t phishnet-api .                                  
docker tag phishnet-api:latest 311141523490.dkr.ecr.us-west-1.amazonaws.com/phishnet-api:latest
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin 311141523490.dkr.ecr.us-west-1.amazonaws.com
docker push 311141523490.dkr.ecr.us-west-1.amazonaws.com/phishnet-api:latest
