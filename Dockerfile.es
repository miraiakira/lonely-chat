# Custom Elasticsearch image with IK plugin (and optional Pinyin) for ES 8.15.3
FROM docker.elastic.co/elasticsearch/elasticsearch:8.15.3

# Optional build arg to install pinyin plugin as well
ARG INSTALL_PINYIN=true

# Install IK plugin (version must match ES version)
RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install --batch https://get.infini.cloud/elasticsearch/analysis-ik/8.15.3 \
    && echo "Installed analysis-ik for ES 8.15.3" \
    # Optional: install analysis-pinyin when requested
    && if [ "$INSTALL_PINYIN" = "true" ]; then \
         /usr/share/elasticsearch/bin/elasticsearch-plugin install --batch https://get.infini.cloud/elasticsearch/analysis-pinyin/8.15.3 ; \
       fi

# No additional changes; rely on docker-compose to set envs/volumes/ports