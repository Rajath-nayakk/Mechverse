#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MechanicalSystems/FastenerComponent.h"
#include "ToolBase.generated.h"

UENUM(BlueprintType)
enum class EToolCategory : uint8
{
	HandWrench UMETA(DisplayName = "Hand Spanner / Wrench"),
	RatchetSocket UMETA(DisplayName = "Ratchet with Socket"),
	TorqueWrench UMETA(DisplayName = "Torque Wrench"),
	ImpactGun UMETA(DisplayName = "Pneumatic/Electric Impact Gun"),
	Multimeter UMETA(DisplayName = "Digital Multimeter"),
	WelderMIG UMETA(DisplayName = "MIG Welding Torch"),
	DentPuller UMETA(DisplayName = "Bodywork Dent Puller"),
	PressureWasher UMETA(DisplayName = "Pressure Washer / Cleaner"),
	PaintSprayGun UMETA(DisplayName = "Paint HVLP Spray Gun")
};

UCLASS()
class MECHVERSE_API AToolBase : public AActor
{
	GENERATED_BODY()

public:
	AToolBase();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool")
	FText ToolName;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool")
	EToolCategory Category;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool|Mechanical")
	float InstalledSocketSizeMm; // e.g. 17.0 mm

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool|Mechanical")
	float ConfiguredTorqueSettingNm; // For torque wrenches

	UFUNCTION(BlueprintCallable, Category = "Tool|Validation")
	bool CanOperateOnFastener(const FFastenerSpecification& FastenerSpec, FText& OutFailureReason) const;
};
