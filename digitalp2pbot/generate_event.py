import json

data = {
    "specversion": "1.0",
    "source": "com.playvox.admin",
    "type": "com.playvox.admin.account.upsert",
    "id": "dba97be9-1b9c-4a8d-8876-716731b1f409",
    "time": "2024-01-10T00:05:17.725966Z",
    "datacontenttype": "application/json",
    "data": {
        "_id": "65830607f0c1ec47e2b01ebc",
        "name": "Account Investor Program",
        "subdomain": "account-investor",
        "salesforce_account_id": "810d1ef74cbd568bf8",
        "account_owner": {
            "first_name": "Jack",
            "last_name": "Lockman",
            "email": "jack@test.com"
        },
        "environment_type": "staging",
        "region": "us-east-1",
        "language": "en_US",
        "plan_details": [
            {
                "salesforce_site_id": "7ceb8d501944c713a1",
                "subdomain": "account-investor",
                "time_zone": -5,
                "sku_id": "47e5a7fea2",
                "sku_name": "QMS",
                "licenses": 2,
                "start_date": "2023-12-20T15:19:35.000000Z",
                "end_date": "2024-12-20T15:19:35.000000Z",
                "trial": False,
                "sku_options": [
                    {
                        "option": "quality",
                        "enabled": True
                    }
                ],
                "_id": "65830607bca1595ceac7f579"
            },
            {
                "salesforce_site_id": "7ceb8d501944c713a1",
                "subdomain": "account-investor",
                "time_zone": -5,
                "sku_id": "47e5a7fea3",
                "sku_name": "WFM",
                "licenses": 2,
                "start_date": "2023-12-20T15:19:35.000000Z",
                "end_date": "2024-12-20T15:19:35.000000Z",
                "trial": False,
                "sku_options": [
                    {
                        "option": "wfm",
                        "enabled": True
                    }
                ],
                "_id": "65830607bca1595ceac7f579"
            }
        ],
        "login_mechanisms": [],
        "user_pool": None,
        "created_at": "2023-12-20T15:19:35.795000Z",
        "updated_at": "2024-01-10T00:05:17.413000Z",
        "stage": "client"
    },
    "plvxspecversion": "1.0",
    "plvxheader": None,
    "plvxidentity": {
        "account_id": "65830607f0c1ec47e2b01ebc"
    }
}

# Serialize the data using json.dumps
serialized_data = json.dumps(data).replace('"', r'\"')

# Print or use serialized_data as needed
print(serialized_data)
