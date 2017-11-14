newRoof = input()
oldRoof = input()
output = ""
for i in newRoof:
    if i != " " and oldRoof[newRoof.index(i)] != "_":
        output = "It doesn't fit..."
        break
if output == "":
    output = "It fits!"
print(output)

#WORKING