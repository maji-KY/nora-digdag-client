FROM node:10-alpine

RUN apk --update --no-cache add \
git && \
git clone https://github.com/maji-KY/nora-digdag-client.git && \
cd nora-digdag-client && \
yarn --frozen-lockfile --non-interactive && yarn build && yarn install --pure-lockfile --non-interactive --production --flat && \
yarn cache clean && \
cd .. && \
mv nora-digdag-client/dist .  && \
mv nora-digdag-client/node_modules . && \
rm -rf nora-digdag-client && \
apk del --purge \
git

ENTRYPOINT ["node", "dist/bundle.js"]
CMD []
