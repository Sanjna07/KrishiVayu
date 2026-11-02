#!/usr/bin/env bash
git filter-branch -f --env-filter '
GIT_AUTHOR_NAME="Manan Goel"
GIT_AUTHOR_EMAIL="147349359+Manan-Goel@users.noreply.github.com"
GIT_COMMITTER_NAME="Manan Goel"
GIT_COMMITTER_EMAIL="147349359+Manan-Goel@users.noreply.github.com"
export GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL
' --tag-name-filter cat -- --branches --tags
