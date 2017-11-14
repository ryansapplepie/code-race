previous = 0
oPrevious = 1
final = "0 1"
o = False
for i in range(int(input()) - 2):
    s = previous + oPrevious
    final += (" " + str(s))
    if o == False:
        previous = s
        o = not o
    else:
      oPrevious = s
      o = not o
print(final)

#WORKING