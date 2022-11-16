
1. run the controller locally (Prerequisite)
# terminal 1st
cd controllers/database/
make run
2. run all the tests
   make test
   Optional run a specific test for debugging
# run a specific test
go test ./e2e/account_test.go