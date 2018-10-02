FROM node:10-alpine

RUN apk --update --no-cache add \
git && \
git clone https://github.com/maji-KY/nora-digdag-client.git && \
cd nora-digdag-client && \
yarn && yarn build && \
apk del --purge \
git

ENTRYPOINT ["node", "nora-digdag-client/dist/bundle.js"]
CMD []
