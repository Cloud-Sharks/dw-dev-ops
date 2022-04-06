# Ansible

## How to use

- Use `ansible-playbook init-bastion.yml` to initialize the empty bastion instance

- Use `ansible-playbook --ask-vault-pass -e @roles/common/vars/vars.yml eks.yml` to spin up an eks cluster
  - Optionally you can pass in `-e "branch=<branch-name>" to use a specific branch`
